import pool from "../db/db.js";

// ─── GET /dashboard/geography/by-country ─────────────────────────────────
// fraud count and rate per merchant country
// used for the choropleth world map on the dashboard
// optional ?limit= param (default returns all countries)

export const getByCountry = async (req, res) => {
  try {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 100) : null;
    const params = [];

    const result = await pool.query(
      `SELECT
          m.country,

          COUNT(DISTINCT m.merchant_id) AS merchant_count,
          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = false) AS legit_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,

          -- risk level breakdown per country
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'LOW') AS low_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'MEDIUM') AS medium_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'HIGH') AS high_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'CRITICAL') AS critical_count,

          -- action breakdown per country
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'ALLOW') AS allow_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'REVIEW') AS review_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'BLOCK') AS block_count,

          -- total volume and amount at risk in USD per country
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
       GROUP BY m.country
       ORDER BY fraud_count DESC
       ${limit ? `LIMIT ${limit}` : ""}`,
      params
    );

    const data = result.rows.map((row) => ({
      ...row,
      merchant_count: parseInt(row.merchant_count),
      total_transactions: parseInt(row.total_transactions),
      fraud_count: parseInt(row.fraud_count),
      legit_count: parseInt(row.legit_count),
      fraud_rate_percent: parseFloat(row.fraud_rate_percent || 0),
      avg_fraud_probability: parseFloat(row.avg_fraud_probability || 0),
      low_count: parseInt(row.low_count),
      medium_count: parseInt(row.medium_count),
      high_count: parseInt(row.high_count),
      critical_count: parseInt(row.critical_count),
      allow_count: parseInt(row.allow_count),
      review_count: parseInt(row.review_count),
      block_count: parseInt(row.block_count),
      total_volume_usd: parseFloat(row.total_volume_usd || 0),
      amount_at_risk_usd: parseFloat(row.amount_at_risk_usd || 0),
    }));

    // global summary across all countries - useful for map legend scaling
    const totalFraud = data.reduce((sum, row) => sum + row.fraud_count, 0);
    const totalTransactions = data.reduce((sum, row) => sum + row.total_transactions, 0);
    const totalAtRisk = data.reduce((sum, row) => sum + row.amount_at_risk_usd, 0);
    const highestFraudRate = data.reduce((max, row) => Math.max(max, row.fraud_rate_percent), 0);

    res.json({
      success: true,
      summary: {
        total_countries: data.length,
        total_transactions: totalTransactions,
        total_fraud: totalFraud,
        total_at_risk_usd: parseFloat(totalAtRisk.toFixed(2)),
        highest_fraud_rate: highestFraudRate,
        // highest fraud rate across all countries -
        // frontend uses this to scale the choropleth color intensity
      },
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getByCountry error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/geography/by-location ────────────────────────────────
// fraud count per transaction location (city level)
// optional ?limit= param (default 20, max 100)
// optional ?min_transactions= to filter out low-volume locations

export const getByLocation = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const minTransactions = parseInt(req.query.min_transactions) || 1;

    const result = await pool.query(
      `SELECT
          t.location,

          COUNT(t.transaction_id) AS total_transactions,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true) AS fraud_count,
          COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = false) AS legit_count,

          ROUND(
            COUNT(t.transaction_id) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(t.transaction_id), 0), 2
          ) AS fraud_rate_percent,

          ROUND(AVG(r.fraud_probability)::numeric, 4) AS avg_fraud_probability,

          -- risk level breakdown per location
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'HIGH') AS high_count,
          COUNT(t.transaction_id) FILTER (WHERE r.risk_level = 'CRITICAL') AS critical_count,

          -- action breakdown per location
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'BLOCK') AS block_count,
          COUNT(t.transaction_id) FILTER (WHERE r.action = 'REVIEW') AS review_count,

          -- amount at risk per location in USD
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

       FROM transactions t
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       WHERE t.location IS NOT NULL
       GROUP BY t.location
       HAVING COUNT(t.transaction_id) >= $1
       ORDER BY fraud_count DESC
       LIMIT $2`,
      [minTransactions, limit]
    );

    const data = result.rows.map((row) => ({
      ...row,
      total_transactions: parseInt(row.total_transactions),
      fraud_count: parseInt(row.fraud_count),
      legit_count: parseInt(row.legit_count),
      fraud_rate_percent: parseFloat(row.fraud_rate_percent || 0),
      avg_fraud_probability: parseFloat(row.avg_fraud_probability || 0),
      high_count: parseInt(row.high_count),
      critical_count: parseInt(row.critical_count),
      block_count: parseInt(row.block_count),
      review_count: parseInt(row.review_count),
      amount_at_risk_usd: parseFloat(row.amount_at_risk_usd || 0),
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getByLocation error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};