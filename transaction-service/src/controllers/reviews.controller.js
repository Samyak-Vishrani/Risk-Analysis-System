import pool from "../db/db.js";

// ─── GET /reviews/pending ─────────────────────────────────────────────────
// all REVIEW + BLOCK transactions not yet reviewed
// sorted by fraud_probability descending so highest risk sits at top
// optional filters: ?action=REVIEW|BLOCK ?risk_level= ?page= ?limit=

export const getPendingReviews = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = ["r.reviewed = false", "r.action IN ('REVIEW', 'BLOCK')"];
    const params = [];

    if (req.query.action) {
      params.push(req.query.action.toUpperCase());
      conditions.push(`r.action = $${params.length}`);
    }

    if (req.query.risk_level) {
      params.push(req.query.risk_level.toUpperCase());
      conditions.push(`r.risk_level = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM risk_scores r
       JOIN transactions t ON t.transaction_id = r.transaction_id
       ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const result = await pool.query(
      `SELECT
          t.transaction_id,
          t.amount,
          t.currency,
          ROUND((t.amount * CASE t.currency
            WHEN 'USD' THEN 1.0
            WHEN 'INR' THEN 0.012
            WHEN 'EUR' THEN 1.08
            WHEN 'GBP' THEN 1.27
            WHEN 'JPY' THEN 0.0067
            WHEN 'AED' THEN 0.27
            ELSE 1.0
          END)::numeric, 2) AS amount_usd,
          t.location,
          t.transaction_time,
          t.is_fraud,

          r.fraud_probability,
          r.risk_level,
          r.action,
          r.scored_at,

          m.merchant_id,
          m.merchant_name,
          m.category AS merchant_category,
          m.country AS merchant_country,
          m.risk_rating AS merchant_risk_rating,

          c.customer_id,
          c.name AS customer_name,
          c.age AS customer_age,
          c.income AS customer_income,

          d.device_id,
          d.device_type,
          d.registered_at AS device_registered_at,
          ROUND(
            EXTRACT(DAY FROM (t.transaction_time - d.registered_at))::numeric, 1
          ) AS device_age_at_transaction

       FROM risk_scores r
       JOIN transactions t ON t.transaction_id = r.transaction_id
       JOIN merchants m ON m.merchant_id = t.merchant_id
       JOIN customers c ON c.customer_id = t.customer_id
       JOIN devices d ON d.device_id = t.device_id
       ${whereClause}
       ORDER BY r.fraud_probability DESC
       LIMIT $${limitParam}
       OFFSET $${offsetParam}`,
      params
    );

    res.json({
      success: true,
      pagination: {
        total,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      data: result.rows,
    });
  } catch (err) {
    console.error("getPendingReviews error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /reviews/pending/count ───────────────────────────────────────────
// lightweight count for the nav badge — no joins needed
// returns total unreviewed + breakdown by action

export const getPendingReviewsCount = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE action = 'REVIEW') AS review_count,
          COUNT(*) FILTER (WHERE action = 'BLOCK') AS block_count
       FROM risk_scores
       WHERE reviewed = false
         AND action IN ('REVIEW', 'BLOCK')`
    );

    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        total: parseInt(row.total),
        review_count: parseInt(row.review_count),
        block_count: parseInt(row.block_count),
      },
    });
  } catch (err) {
    console.error("getPendingReviewsCount error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── PATCH /reviews/:transaction_id/resolve ───────────────────────────────
// mark a transaction as reviewed
// body: { analyst_decision, analyst_note }
// analyst_decision must be one of:
// CONFIRMED_FRAUD | FALSE_POSITIVE | NEEDS_INVESTIGATION

export const resolveReview = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const { analyst_decision, analyst_note } = req.body;

    // validate decision value
    const validDecisions = ["CONFIRMED_FRAUD", "FALSE_POSITIVE", "NEEDS_INVESTIGATION"];
    if (!analyst_decision || !validDecisions.includes(analyst_decision)) {
      return res.status(400).json({
        success: false,
        error: `analyst_decision must be one of: ${validDecisions.join(", ")}`,
      });
    }

    // check transaction exists and is pending review
    const checkResult = await pool.query(
      `SELECT transaction_id, reviewed, action
       FROM risk_scores
       WHERE transaction_id = $1`,
      [transaction_id]
    );

    if (checkResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found in risk_scores",
      });
    }

    const existing = checkResult.rows[0];

    if (existing.reviewed) {
      return res.status(409).json({
        success: false,
        error: "Transaction has already been reviewed",
        reviewed_at: existing.reviewed_at,
      });
    }

    // mark as reviewed
    const updateResult = await pool.query(
      `UPDATE risk_scores
       SET
         reviewed = true,
         reviewed_at = NOW(),
         analyst_decision = $1,
         analyst_note = $2
       WHERE transaction_id = $3
       RETURNING
         transaction_id,
         fraud_probability,
         risk_level,
         action,
         reviewed,
         reviewed_at,
         analyst_decision,
         analyst_note`,
      [analyst_decision, analyst_note || null, transaction_id]
    );

    res.json({
      success: true,
      message: "Transaction marked as reviewed",
      data: updateResult.rows[0],
    });
  } catch (err) {
    console.error("resolveReview error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /reviews/history ─────────────────────────────────────────────────
// all previously reviewed transactions
// optional filters: ?analyst_decision= ?action= ?from= ?to= ?page= ?limit=

export const getReviewHistory = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = ["r.reviewed = true"];
    const params = [];

    if (req.query.analyst_decision) {
      params.push(req.query.analyst_decision.toUpperCase());
      conditions.push(`r.analyst_decision = $${params.length}`);
    }

    if (req.query.action) {
      params.push(req.query.action.toUpperCase());
      conditions.push(`r.action = $${params.length}`);
    }

    if (req.query.from) {
      params.push(req.query.from);
      conditions.push(`r.reviewed_at >= $${params.length}`);
    }

    if (req.query.to) {
      params.push(req.query.to);
      conditions.push(`r.reviewed_at <= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM risk_scores r
       JOIN transactions t ON t.transaction_id = r.transaction_id
       ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const result = await pool.query(
      `SELECT
          t.transaction_id,
          t.amount,
          t.currency,
          ROUND((t.amount * CASE t.currency
            WHEN 'USD' THEN 1.0
            WHEN 'INR' THEN 0.012
            WHEN 'EUR' THEN 1.08
            WHEN 'GBP' THEN 1.27
            WHEN 'JPY' THEN 0.0067
            WHEN 'AED' THEN 0.27
            ELSE 1.0
          END)::numeric, 2) AS amount_usd,
          t.location,
          t.transaction_time,
          t.is_fraud,

          r.fraud_probability,
          r.risk_level,
          r.action,
          r.scored_at,
          r.reviewed_at,
          r.analyst_decision,
          r.analyst_note,

          m.merchant_name,
          m.category AS merchant_category,

          c.name AS customer_name,
          c.age AS customer_age

       FROM risk_scores r
       JOIN transactions t ON t.transaction_id = r.transaction_id
       JOIN merchants m ON m.merchant_id = t.merchant_id
       JOIN customers c ON c.customer_id = t.customer_id
       ${whereClause}
       ORDER BY r.reviewed_at DESC
       LIMIT $${limitParam}
       OFFSET $${offsetParam}`,
      params
    );

    // summary breakdown of analyst decisions in the filtered result set
    const summaryResult = await pool.query(
      `SELECT
          analyst_decision,
          COUNT(*) AS count
       FROM risk_scores r
       JOIN transactions t ON t.transaction_id = r.transaction_id
       ${whereClause}
       GROUP BY analyst_decision`,
      params.slice(0, params.length - 2) // exclude limit and offset params
    );

    const decisionSummary = {
      CONFIRMED_FRAUD: 0,
      FALSE_POSITIVE: 0,
      NEEDS_INVESTIGATION: 0,
    };
    for (const row of summaryResult.rows) {
      if (row.analyst_decision) {
        decisionSummary[row.analyst_decision] = parseInt(row.count);
      }
    }

    res.json({
      success: true,
      pagination: {
        total,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      decision_summary: decisionSummary,
      data: result.rows,
    });
  } catch (err) {
    console.error("getReviewHistory error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};