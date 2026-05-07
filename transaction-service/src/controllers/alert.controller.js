import pool from "../db/db.js";

// ─── GET /alerts/critical ─────────────────────────────────────────────────
// all unreviewed CRITICAL transactions for the urgent banner
// sorted by fraud_probability descending - highest confidence fraud first
// optional ?limit= param (default 50, max 200)
// kept intentionally lean - only columns needed for the alert banner

export const getCriticalAlerts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

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
          t.transaction_time,
          t.location,

          r.fraud_probability,
          r.risk_level,
          r.action,
          r.scored_at,

          -- how long has this been sitting unreviewed in minutes
          ROUND(
            EXTRACT(EPOCH FROM (NOW() - r.scored_at)) / 60
          ) AS unreviewed_for_minutes,

          m.merchant_name,
          m.category AS merchant_category,
          m.country AS merchant_country,

          c.customer_id,
          c.name AS customer_name,

          d.device_type,
          -- flag if device was new at time of transaction
          CASE
            WHEN EXTRACT(DAY FROM (t.transaction_time - d.registered_at)) < 1
            THEN true ELSE false
          END AS was_new_device

       FROM risk_scores r
       JOIN transactions t ON t.transaction_id = r.transaction_id
       JOIN merchants m ON m.merchant_id = t.merchant_id
       JOIN customers c ON c.customer_id = t.customer_id
       JOIN devices d ON d.device_id = t.device_id
       WHERE r.risk_level = 'CRITICAL'
         AND r.reviewed = false
       ORDER BY r.fraud_probability DESC
       LIMIT $1`,
      [limit]
    );

    // compute oldest unreviewed alert age - useful for SLA tracking
    // if a CRITICAL alert has been sitting for hours that's a problem
    const oldestUnreviewed = result.rows.length > 0
      ? Math.max(...result.rows.map((r) => parseInt(r.unreviewed_for_minutes)))
      : 0;

    const data = result.rows.map((row) => ({
      ...row,
      amount: parseFloat(row.amount),
      amount_usd: parseFloat(row.amount_usd),
      fraud_probability: parseFloat(row.fraud_probability),
      unreviewed_for_minutes: parseInt(row.unreviewed_for_minutes),
      was_new_device: row.was_new_device,
    }));

    res.json({
      success: true,
      meta: {
        total_critical_unreviewed: data.length,
        oldest_unreviewed_minutes: oldestUnreviewed,
        // if oldest_unreviewed_minutes > 60 frontend can show a warning
        // that critical alerts are not being reviewed fast enough
      },
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getCriticalAlerts error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /alerts/count ────────────────────────────────────────────────────
// lightweight count for the notification badge
// returns CRITICAL and HIGH unreviewed counts separately
// no joins - hits only risk_scores for maximum speed
// this is called frequently by the frontend so must be as fast as possible

export const getAlertsCount = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          COUNT(*) AS total_unreviewed,
          COUNT(*) FILTER (WHERE risk_level = 'CRITICAL') AS critical_count,
          COUNT(*) FILTER (WHERE risk_level = 'HIGH') AS high_count,

          -- oldest unreviewed CRITICAL alert in minutes
          ROUND(
            EXTRACT(EPOCH FROM (
              NOW() - MIN(scored_at) FILTER (WHERE risk_level = 'CRITICAL')
            )) / 60
          ) AS oldest_critical_minutes,

          -- oldest unreviewed HIGH alert in minutes
          ROUND(
            EXTRACT(EPOCH FROM (
              NOW() - MIN(scored_at) FILTER (WHERE risk_level = 'HIGH')
            )) / 60
          ) AS oldest_high_minutes

       FROM risk_scores
       WHERE reviewed = false
         AND risk_level IN ('CRITICAL', 'HIGH')`
    );

    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        total_unreviewed: parseInt(row.total_unreviewed || 0),
        critical_count: parseInt(row.critical_count || 0),
        high_count: parseInt(row.high_count || 0),
        oldest_critical_minutes: parseInt(row.oldest_critical_minutes || 0),
        oldest_high_minutes: parseInt(row.oldest_high_minutes || 0),
      },
    });
  } catch (err) {
    console.error("getAlertsCount error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};