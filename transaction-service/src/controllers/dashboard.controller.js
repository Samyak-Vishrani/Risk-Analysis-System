import pool from "../db/db.js";

// ─── GET /dashboard/summary ───────────────────────────────────────────────
// Overview number cards -
// total transactions, fraud count, fraud rate, total amount at risk in USD

export const getSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(t.transaction_id) AS total_transactions,
        COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS total_fraud,
        ROUND(
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
          * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
        ) AS fraud_rate_percent,
        ROUND(
          SUM(t.amount * CASE t.currency
            WHEN 'USD' THEN 1.0
            WHEN 'INR' THEN 0.012
            WHEN 'EUR' THEN 1.08
            WHEN 'GBP' THEN 1.27
            WHEN 'JPY' THEN 0.0067
            WHEN 'AED' THEN 0.27
            ELSE 1.0
          END) FILTER (WHERE t.is_fraud = true)::numeric, 2
        ) AS amount_at_risk_usd,
        ROUND(
          SUM(t.amount * CASE t.currency
            WHEN 'USD' THEN 1.0
            WHEN 'INR' THEN 0.012
            WHEN 'EUR' THEN 1.08
            WHEN 'GBP' THEN 1.27
            WHEN 'JPY' THEN 0.0067
            WHEN 'AED' THEN 0.27
            ELSE 1.0
          END)::numeric, 2
        ) AS total_volume_usd,
        COUNT(t.transaction_id) FILTER (
          WHERE t.transaction_time >= NOW() - INTERVAL '24 hours'
        ) AS transactions_last_24h,
        COUNT(t.transaction_id) FILTER (
          WHERE t.is_fraud = true
          AND   t.transaction_time >= NOW() - INTERVAL '24 hours'
        ) AS fraud_last_24h
      FROM transactions t
      LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
    `);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("getSummary error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/summary/actions ──────────────────────────────────────
// Count of ALLOW / REVIEW / BLOCK
// also includes unreviewed count per action for the nav badge

export const getSummaryActions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        action,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE reviewed = false) AS unreviewed
      FROM risk_scores
      WHERE action IS NOT NULL
      GROUP BY action
      ORDER BY
        CASE action
          WHEN 'BLOCK' THEN 1
          WHEN 'REVIEW' THEN 2
          WHEN 'ALLOW' THEN 3
        END
    `);

    // -- pivot into a flat object so frontend doesn't need to loop
    const data = {
      BLOCK: { total: 0, unreviewed: 0 },
      REVIEW: { total: 0, unreviewed: 0 },
      ALLOW: { total: 0, unreviewed: 0 },
    };

    for (const row of result.rows) {
      data[row.action] = {
        total: parseInt(row.total),
        unreviewed: parseInt(row.unreviewed),
      };
    }

    res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("getSummaryActions error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/summary/risk-levels ──────────────────────────────────
// Count and percentage of LOW / MEDIUM / HIGH / CRITICAL

export const getSummaryRiskLevels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        risk_level,
        COUNT(*) AS count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
      FROM risk_scores
      WHERE risk_level IS NOT NULL
      GROUP BY risk_level
      ORDER BY
        CASE risk_level
          WHEN 'CRITICAL'THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END
    `);

    // also pivot into flat object for easy frontend access
    const data = {
      CRITICAL: { count: 0, percentage: 0 },
      HIGH: { count: 0, percentage: 0 },
      MEDIUM: { count: 0, percentage: 0 },
      LOW: { count: 0, percentage: 0 },
    };

    for (const row of result.rows) {
      data[row.risk_level] = {
        count: parseInt(row.count),
        percentage: parseFloat(row.percentage),
      };
    }

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("getSummaryRiskLevels error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};