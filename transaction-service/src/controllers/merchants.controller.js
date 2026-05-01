import pool from "../db/db.js";

// ─── GET /dashboard/merchants/top-fraud ──────────────────────────────────
// top 10 merchants by fraud count
// also includes total transactions and fraud rate % for context

export const getTopFraudMerchants = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const result = await pool.query(
      `SELECT
          m.merchant_id,
          m.merchant_name,
          m.category,
          m.country,
          m.risk_rating,

          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = false) AS legit_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          )  fraud_rate_percent,

          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,

          -- total amount at risk in USD for this merchant
          ROUND(SUM(
            t.amount * CASE t.currency
              WHEN 'USD' THEN 1.0
              WHEN 'INR' THEN 0.012
              WHEN 'EUR' THEN 1.08
              WHEN 'GBP' THEN 1.27
              WHEN 'JPY' THEN 0.0067
              WHEN 'AED' THEN 0.27
              ELSE 1.0
            END
          ) FILTER (WHERE t.is_fraud = true)::numeric, 2) AS amount_at_risk_usd

       FROM merchants m
       JOIN transactions t ON t.merchant_id = m.merchant_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       GROUP BY m.merchant_id, m.merchant_name, m.category, m.country, m.risk_rating
       ORDER BY fraud_count DESC
       LIMIT $1`,
      [limit]
    );

    const data = result.rows.map((row) => ({
      ...row,
      total_transactions: parseInt(row.total_transactions),
      fraud_count: parseInt(row.fraud_count),
      legit_count: parseInt(row.legit_count),
      fraud_rate_percent: parseFloat(row.fraud_rate_percent || 0),
      avg_fraud_probability: parseFloat(row.avg_fraud_probability || 0),
      amount_at_risk_usd: parseFloat(row.amount_at_risk_usd || 0),
      risk_rating: parseFloat(row.risk_rating),
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getTopFraudMerchants error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/merchants/by-category ────────────────────────────────
// fraud rate per merchant category
// also includes action breakdown per category so you can see
// how many transactions per category are being blocked vs allowed

export const getMerchantsByCategory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          m.category,

          COUNT(DISTINCT m.merchant_id) AS merchant_count,
          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          ROUND(AVG(m.risk_rating)::numeric, 4) AS avg_risk_rating,
          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,

          -- action breakdown per category
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'ALLOW') AS allow_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'REVIEW') AS review_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'BLOCK') AS block_count,

          -- amount at risk per category in USD
          ROUND(SUM(
            t.amount * CASE t.currency
              WHEN 'USD' THEN 1.0
              WHEN 'INR' THEN 0.012
              WHEN 'EUR' THEN 1.08
              WHEN 'GBP' THEN 1.27
              WHEN 'JPY' THEN 0.0067
              WHEN 'AED' THEN 0.27
              ELSE 1.0
            END
          ) FILTER (WHERE t.is_fraud = true)::numeric, 2) AS amount_at_risk_usd

       FROM merchants m
       JOIN transactions t ON t.merchant_id = m.merchant_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       GROUP BY m.category
       ORDER BY fraud_count DESC`
    );

    const data = result.rows.map((row) => ({
      ...row,
      merchant_count: parseInt(row.merchant_count),
      total_transactions: parseInt(row.total_transactions),
      fraud_count: parseInt(row.fraud_count),
      fraud_rate_percent: parseFloat(row.fraud_rate_percent || 0),
      avg_risk_rating: parseFloat(row.avg_risk_rating || 0),
      avg_fraud_probability: parseFloat(row.avg_fraud_probability || 0),
      allow_count: parseInt(row.allow_count),
      review_count: parseInt(row.review_count),
      block_count: parseInt(row.block_count),
      amount_at_risk_usd: parseFloat(row.amount_at_risk_usd || 0),
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getMerchantsByCategory error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/merchants/:id ────────────────────────────────────────
// single merchant full breakdown —
// summary stats + recent transactions + risk level distribution

export const getMerchantById = async (req, res) => {
  try {
    const { id } = req.params;

    // merchant summary stats
    const summaryResult = await pool.query(
      `SELECT
          m.merchant_id,
          m.merchant_name,
          m.category,
          m.country,
          m.risk_rating,

          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,
          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,
          ROUND(MAX(r.fraud_probability)::numeric, 4) AS max_fraud_probability,

          ROUND(SUM(
            t.amount * CASE t.currency
              WHEN 'USD' THEN 1.0
              WHEN 'INR' THEN 0.012
              WHEN 'EUR' THEN 1.08
              WHEN 'GBP' THEN 1.27
              WHEN 'JPY' THEN 0.0067
              WHEN 'AED' THEN 0.27
              ELSE 1.0
            END
          )::numeric, 2) AS total_volume_usd,

          ROUND(SUM(
            t.amount * CASE t.currency
              WHEN 'USD' THEN 1.0
              WHEN 'INR' THEN 0.012
              WHEN 'EUR' THEN 1.08
              WHEN 'GBP' THEN 1.27
              WHEN 'JPY' THEN 0.0067
              WHEN 'AED' THEN 0.27
              ELSE 1.0
            END
          ) FILTER (WHERE t.is_fraud = true)::numeric, 2) AS amount_at_risk_usd

       FROM merchants m
       JOIN transactions t ON t.merchant_id = m.merchant_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE m.merchant_id = $1
       GROUP BY m.merchant_id, m.merchant_name, m.category, m.country, m.risk_rating`,
      [id]
    );

    if (summaryResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Merchant not found" });
    }

    // risk level distribution for this merchant
    const riskDistResult = await pool.query(
      `SELECT
          r.risk_level,
          COUNT(*) AS count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
       FROM transactions t
       JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE t.merchant_id = $1
         AND r.risk_level IS NOT NULL
       GROUP BY r.risk_level
       ORDER BY
         CASE r.risk_level
           WHEN 'CRITICAL' THEN 1
           WHEN 'HIGH' THEN 2
           WHEN 'MEDIUM' THEN 3
           WHEN 'LOW' THEN 4
         END`,
      [id]
    );

    // action breakdown for this merchant
    const actionResult = await pool.query(
      `SELECT
          r.action,
          COUNT(*) AS count
       FROM transactions t
       JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE t.merchant_id = $1 AND r.action IS NOT NULL
       GROUP BY r.action`,
      [id]
    );

    // recent 10 transactions for this merchant
    const recentResult = await pool.query(
      `SELECT
          t.transaction_id,
          t.amount,
          t.currency,
          t.transaction_time,
          t.is_fraud,
          t.location,
          r.fraud_probability,
          r.risk_level,
          r.action
       FROM transactions t
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE t.merchant_id = $1
       ORDER BY t.transaction_time DESC
       LIMIT 10`,
      [id]
    );

    // pivot action breakdown into flat object
    const actions = { ALLOW: 0, REVIEW: 0, BLOCK: 0 };
    for (const row of actionResult.rows) {
      actions[row.action] = parseInt(row.count);
    }

    const summary = summaryResult.rows[0];

    res.json({
      success: true,
      data: {
        merchant: {
          merchant_id: summary.merchant_id,
          merchant_name: summary.merchant_name,
          category: summary.category,
          country: summary.country,
          risk_rating: parseFloat(summary.risk_rating),
          total_transactions: parseInt(summary.total_transactions),
          fraud_count: parseInt(summary.fraud_count),
          fraud_rate_percent: parseFloat(summary.fraud_rate_percent || 0),
          avg_fraud_probability: parseFloat(summary.avg_fraud_probability || 0),
          max_fraud_probability: parseFloat(summary.max_fraud_probability || 0),
          total_volume_usd: parseFloat(summary.total_volume_usd || 0),
          amount_at_risk_usd: parseFloat(summary.amount_at_risk_usd || 0),
        },
        risk_distribution: riskDistResult.rows.map((row) => ({
          risk_level: row.risk_level,
          count: parseInt(row.count),
          percentage: parseFloat(row.percentage),
        })),
        actions,
        recent_transactions: recentResult.rows,
      },
    });
  } catch (err) {
    console.error("getMerchantById error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};