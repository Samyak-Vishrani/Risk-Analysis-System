import pool from "../db/db.js";

// ─── GET /dashboard/customers/top-risk ───────────────────────────────────
// top customers ranked by number of HIGH + CRITICAL transactions
// optional ?limit= param (default 10, max 50)

export const getTopRiskCustomers = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const result = await pool.query(
      `SELECT
          c.customer_id,
          c.name,
          c.age,
          c.income,
          c.location,
          c.account_created,

          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          -- high risk count - what this ranking is based on
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

          -- total amount at risk for this customer in USD
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

       FROM customers c
       JOIN transactions t ON t.customer_id = c.customer_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       GROUP BY c.customer_id, c.name, c.age, c.income, c.location, c.account_created
       ORDER BY high_risk_count DESC
       LIMIT $1`,
      [limit]
    );

    const data = result.rows.map((row) => ({
      ...row,
      income: parseFloat(row.income),
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
    console.error("getTopRiskCustomers error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/customers/by-age-bracket ─────────────────────────────
// fraud rate broken down by age group
// brackets: 18-25, 26-35, 36-45, 46-55, 56-65, 65+

export const getCustomersByAgeBracket = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          CASE
            WHEN c.age BETWEEN 18 AND 25 THEN '18-25'
            WHEN c.age BETWEEN 26 AND 35 THEN '26-35'
            WHEN c.age BETWEEN 36 AND 45 THEN '36-45'
            WHEN c.age BETWEEN 46 AND 55 THEN '46-55'
            WHEN c.age BETWEEN 56 AND 65 THEN '56-65'
            ELSE '65+'
          END AS age_bracket,

          COUNT(DISTINCT c.customer_id) AS customer_count,
          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          ROUND(AVG(c.income)::numeric, 2) AS avg_income,
          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,

          -- action breakdown per bracket
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'ALLOW') AS allow_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'REVIEW') AS review_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'BLOCK') AS block_count,

          -- risk level breakdown per bracket
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'LOW') AS low_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'MEDIUM') AS medium_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'HIGH') AS high_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'CRITICAL') AS critical_count

       FROM customers c
       JOIN transactions t ON t.customer_id = c.customer_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       GROUP BY age_bracket
       ORDER BY
         CASE age_bracket
           WHEN '18-25' THEN 1
           WHEN '26-35' THEN 2
           WHEN '36-45' THEN 3
           WHEN '46-55' THEN 4
           WHEN '56-65' THEN 5
           ELSE 6
         END`
    );

    const data = result.rows.map((row) => ({
      ...row,
      customer_count: parseInt(row.customer_count),
      total_transactions: parseInt(row.total_transactions),
      fraud_count: parseInt(row.fraud_count),
      fraud_rate_percent: parseFloat(row.fraud_rate_percent || 0),
      avg_income: parseFloat(row.avg_income || 0),
      avg_fraud_probability: parseFloat(row.avg_fraud_probability || 0),
      allow_count: parseInt(row.allow_count),
      review_count: parseInt(row.review_count),
      block_count: parseInt(row.block_count),
      low_count: parseInt(row.low_count),
      medium_count: parseInt(row.medium_count),
      high_count: parseInt(row.high_count),
      critical_count: parseInt(row.critical_count),
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getCustomersByAgeBracket error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/customers/:id ────────────────────────────────────────
// single customer - full profile + risk summary + recent transactions

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // customer summary stats
    const summaryResult = await pool.query(
      `SELECT
          c.customer_id,
          c.name,
          c.age,
          c.income,
          c.location,
          c.account_created,

          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          COUNT(t.transaction_id) FILTER (
            WHERE r.risk_level IN ('HIGH', 'CRITICAL')
          ) AS high_risk_count,

          COUNT(t.transaction_id) FILTER (
            WHERE r.action = 'BLOCK'
          ) AS blocked_count,

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

       FROM customers c
       JOIN transactions t ON t.customer_id = c.customer_id
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE c.customer_id = $1
       GROUP BY c.customer_id, c.name, c.age, c.income, c.location, c.account_created`,
      [id]
    );

    if (summaryResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    // risk level distribution for this customer
    const riskDistResult = await pool.query(
      `SELECT
          r.risk_level,
          COUNT(*) AS count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
       FROM transactions t
       JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE t.customer_id = $1
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

    // action breakdown for this customer
    const actionResult = await pool.query(
      `SELECT
          r.action,
          COUNT(*) AS count
       FROM transactions t
       JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE t.customer_id = $1
         AND r.action IS NOT NULL
       GROUP BY r.action`,
      [id]
    );

    // devices used by this customer
    const devicesResult = await pool.query(
      `SELECT
          d.device_id,
          d.device_type,
          d.registered_at,
          COUNT(t.transaction_id) AS transaction_count,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,
          EXTRACT(DAY FROM (NOW() - d.registered_at)) AS device_age_days
       FROM devices d
       JOIN transactions t ON t.device_id = d.device_id
       WHERE d.customer_id = $1
       GROUP BY d.device_id, d.device_type, d.registered_at
       ORDER BY d.registered_at DESC`,
      [id]
    );

    // recent 10 transactions for this customer
    const recentResult = await pool.query(
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
          m.merchant_name,
          m.category AS merchant_category
       FROM transactions t
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       LEFT JOIN merchants m ON m.merchant_id = t.merchant_id
       WHERE t.customer_id = $1
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
        customer: {
          customer_id: summary.customer_id,
          name: summary.name,
          age: summary.age,
          income: parseFloat(summary.income),
          location: summary.location,
          account_created: summary.account_created,
          total_transactions: parseInt(summary.total_transactions),
          fraud_count: parseInt(summary.fraud_count),
          fraud_rate_percent: parseFloat(summary.fraud_rate_percent || 0),
          high_risk_count: parseInt(summary.high_risk_count),
          blocked_count: parseInt(summary.blocked_count),
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
        devices: devicesResult.rows.map((row) => ({
          ...row,
          transaction_count: parseInt(row.transaction_count),
          fraud_count: parseInt(row.fraud_count),
          device_age_days: parseFloat(row.device_age_days),
        })),
        recent_transactions: recentResult.rows,
      },
    });
  } catch (err) {
    console.error("getCustomerById error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};