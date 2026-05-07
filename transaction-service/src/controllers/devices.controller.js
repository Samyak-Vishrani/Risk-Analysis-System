import pool from "../db/db.js";

// ─── GET /dashboard/devices/by-age ───────────────────────────────────────
// fraud rate broken down by device age bracket
// brackets mirror the scoreDevice() tiers from the original worker heuristic:
// same-day, within a week, within a month, older than a month
// also includes a % of CRITICAL transactions that came from same-day devices
// which directly validates the device_new signal the model learned

export const getDevicesByAge = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          CASE
            WHEN EXTRACT(DAY FROM (t.transaction_time - d.registered_at)) < 1
              THEN 'same-day'
            WHEN EXTRACT(DAY FROM (t.transaction_time - d.registered_at)) < 7
              THEN '1-7 days'
            WHEN EXTRACT(DAY FROM (t.transaction_time - d.registered_at)) < 30
              THEN '7-30 days'
            ELSE 'older than 30 days'
          END AS device_age_bracket,

          COUNT(DISTINCT d.device_id) AS device_count,
          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,

          -- risk level breakdown per age bracket
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'LOW') AS low_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'MEDIUM') AS medium_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'HIGH') AS high_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'CRITICAL') AS critical_count,

          -- action breakdown per age bracket
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'ALLOW') AS allow_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'REVIEW') AS review_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'BLOCK') AS block_count,

          -- device type breakdown - mobile vs desktop etc per age bracket
          COUNT(t.transaction_id) FILTER (WHERE d.device_type = 'mobile') AS mobile_count,
          COUNT(t.transaction_id) FILTER (WHERE d.device_type = 'desktop') AS desktop_count,
          COUNT(t.transaction_id) FILTER (WHERE d.device_type = 'tablet') AS tablet_count

       FROM devices d
       JOIN transactions t ON t.device_id = d.device_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       GROUP BY device_age_bracket
       ORDER BY
         CASE device_age_bracket
           WHEN 'same-day' THEN 1
           WHEN '1-7 days' THEN 2
           WHEN '7-30 days' THEN 3
           WHEN 'older than 30 days' THEN 4
         END`
    );

    const data = result.rows.map((row) => ({
      ...row,
      device_count: parseInt(row.device_count),
      total_transactions: parseInt(row.total_transactions),
      fraud_count: parseInt(row.fraud_count),
      fraud_rate_percent: parseFloat(row.fraud_rate_percent || 0),
      avg_fraud_probability: parseFloat(row.avg_fraud_probability || 0),
      low_count: parseInt(row.low_count),
      medium_count: parseInt(row.medium_count),
      high_count: parseInt(row.high_count),
      critical_count: parseInt(row.critical_count),
      allow_count: parseInt(row.allow_count),
      review_count: parseInt(row.review_count),
      block_count: parseInt(row.block_count),
      mobile_count: parseInt(row.mobile_count),
      desktop_count: parseInt(row.desktop_count),
      tablet_count: parseInt(row.tablet_count),
    }));

    // compute what % of all CRITICAL transactions came from same-day devices
    // this is a single insight number useful for the dashboard headline card
    const totalCritical = data.reduce((sum, row) => sum + row.critical_count, 0);
    const sameDayRow = data.find((row) => row.device_age_bracket === "same-day");
    const sameDayCritical = sameDayRow ? sameDayRow.critical_count : 0;
    const sameDayCriticalPercent = totalCritical > 0
      ? parseFloat(((sameDayCritical / totalCritical) * 100).toFixed(2))
      : 0;

    res.json({
      success: true,
      insight: {
        same_day_critical_percent: sameDayCriticalPercent,
        // what % of CRITICAL transactions came from devices registered today
        // high number validates the device_new signal
      },
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getDevicesByAge error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/devices/top-risk ─────────────────────────────────────
// devices with the most HIGH + CRITICAL transactions
// optional ?limit= param (default 10, max 50)
// optional ?device_type= filter (mobile | desktop | tablet)

export const getTopRiskDevices = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const deviceType = req.query.device_type;

    const conditions = [];
    const params = [];

    if (deviceType) {
      params.push(deviceType.toLowerCase());
      conditions.push(`d.device_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // limit and offset params added after conditions
    params.push(limit);
    const limitParam = params.length;

    const result = await pool.query(
      `SELECT
          d.device_id,
          d.device_type,
          d.registered_at,
          d.customer_id,

          -- how old was the device when transactions were made
          ROUND(
            EXTRACT(DAY FROM (NOW() - d.registered_at))::numeric, 1
          ) AS current_age_days,

          c.name AS customer_name,
          c.age AS customer_age,

          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          -- high risk count - ranking basis
          COUNT(t.transaction_id) FILTER (
            WHERE r.risk_level IN ('HIGH', 'CRITICAL')
          ) AS high_risk_count,

          COUNT(t.transaction_id) FILTER (
            WHERE r.risk_level = 'CRITICAL'
          ) AS critical_count,

          COUNT(t.transaction_id) FILTER (
            WHERE r.risk_level = 'HIGH'
          ) AS high_count,

          COUNT(t.transaction_id) FILTER (
            WHERE r.action = 'BLOCK'
          ) AS blocked_count,

          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,
          ROUND(MAX(r.fraud_probability)::numeric, 4) AS max_fraud_probability,

          -- total amount at risk on this device in USD
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

       FROM devices d
       JOIN customers c ON c.customer_id = d.customer_id
       JOIN transactions t ON t.device_id = d.device_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       ${whereClause}
       GROUP BY d.device_id, d.device_type, d.registered_at, d.customer_id,
                c.name, c.age
       ORDER BY high_risk_count DESC
       LIMIT $${limitParam}`,
      params
    );

    const data = result.rows.map((row) => ({
      ...row,
      current_age_days: parseFloat(row.current_age_days),
      total_transactions: parseInt(row.total_transactions),
      fraud_count: parseInt(row.fraud_count),
      fraud_rate_percent: parseFloat(row.fraud_rate_percent || 0),
      high_risk_count: parseInt(row.high_risk_count),
      critical_count: parseInt(row.critical_count),
      high_count: parseInt(row.high_count),
      blocked_count: parseInt(row.blocked_count),
      avg_fraud_probability: parseFloat(row.avg_fraud_probability || 0),
      max_fraud_probability: parseFloat(row.max_fraud_probability || 0),
      amount_at_risk_usd: parseFloat(row.amount_at_risk_usd || 0),
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getTopRiskDevices error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};