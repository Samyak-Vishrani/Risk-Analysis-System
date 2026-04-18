import pool from "../db/db.js";

// ─── HELPER ───────────────────────────────────────────────────────────────
// all trend routes support an optional ?days= query param
// default 90, max 365 - keeps queries fast and charts readable

const getDaysParam = (query) => {
  const days = parseInt(query.days) || 90;
  return Math.min(Math.max(days, 1), 365);
};

// ─── GET /dashboard/trends/fraud-rate ────────────────────────────────────
// fraud rate % per day for the last N days
// also includes raw counts so frontend can show both the % and absolute numbers

export const getFraudRateTrend = async (req, res) => {
  try {
    const days = getDaysParam(req.query);

    const result = await pool.query(
      `SELECT
          DATE(t.transaction_time) AS date,
          COUNT(*) AS total_transactions,
          COUNT(*) FILTER (WHERE t.is_fraud = true) AS fraud_count,
          COUNT(*) FILTER (WHERE t.is_fraud = false) AS legit_count,
          ROUND(
            COUNT(*) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(COUNT(*), 0), 2
          ) AS fraud_rate_percent
       FROM transactions t
       WHERE t.transaction_time >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY DATE(t.transaction_time)
       ORDER BY date ASC`,
      [days]
    );

    res.json({
      success: true,
      days,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    console.error("getFraudRateTrend error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/trends/actions ───────────────────────────────────────
// ALLOW / REVIEW / BLOCK counts per day for the last N days
// returned as both raw rows and pivoted per date for easy charting

export const getActionsTrend = async (req, res) => {
  try {
    const days = getDaysParam(req.query);

    const result = await pool.query(
      `SELECT
          DATE(r.scored_at) AS date,
          COUNT(*) FILTER (WHERE r.action = 'ALLOW') AS allow_count,
          COUNT(*) FILTER (WHERE r.action = 'REVIEW') AS review_count,
          COUNT(*) FILTER (WHERE r.action = 'BLOCK') AS block_count,
          COUNT(*) AS total
       FROM risk_scores r
       WHERE r.scored_at >= NOW() - ($1 || ' days')::INTERVAL
         AND r.action IS NOT NULL
       GROUP BY DATE(r.scored_at)
       ORDER BY date ASC`,
      [days]
    );

    // cast string counts to integers
    const data = result.rows.map((row) => ({
      date: row.date,
      allow_count: parseInt(row.allow_count),
      review_count: parseInt(row.review_count),
      block_count: parseInt(row.block_count),
      total: parseInt(row.total),
    }));

    res.json({
      success: true,
      days,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getActionsTrend error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/trends/amount-at-risk ────────────────────────────────
// total USD amount of fraud transactions per day for the last N days
// also includes total volume per day so frontend can show risk as % of volume

export const getAmountAtRiskTrend = async (req, res) => {
  try {
    const days = getDaysParam(req.query);

    const result = await pool.query(
      `SELECT
          DATE(t.transaction_time) AS date,

          -- total volume in USD (all transactions)
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

          -- amount at risk (fraud only)
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
          ) FILTER (WHERE t.is_fraud = true)::numeric, 2) AS amount_at_risk_usd,

          -- % of total volume that is at risk
          ROUND(
            SUM(
              t.amount * CASE t.currency
                WHEN 'USD' THEN 1.0 WHEN 'INR' THEN 0.012
                WHEN 'EUR' THEN 1.08 WHEN 'GBP' THEN 1.27
                WHEN 'JPY' THEN 0.0067 WHEN 'AED' THEN 0.27
                ELSE 1.0
              END
            ) FILTER (WHERE t.is_fraud = true)
            * 100.0 / NULLIF(SUM(
              t.amount * CASE t.currency
                WHEN 'USD' THEN 1.0 WHEN 'INR' THEN 0.012
                WHEN 'EUR' THEN 1.08 WHEN 'GBP' THEN 1.27
                WHEN 'JPY' THEN 0.0067 WHEN 'AED' THEN 0.27
                ELSE 1.0
              END
            ), 0)::numeric, 2
          ) AS risk_percent_of_volume

       FROM transactions t
       WHERE t.transaction_time >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY DATE(t.transaction_time)
       ORDER BY date ASC`,
      [days]
    );

    const data = result.rows.map((row) => ({
      date: row.date,
      total_volume_usd: parseFloat(row.total_volume_usd || 0),
      amount_at_risk_usd: parseFloat(row.amount_at_risk_usd || 0),
      risk_percent_of_volume: parseFloat(row.risk_percent_of_volume || 0),
    }));

    res.json({
      success: true,
      days,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getAmountAtRiskTrend error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /dashboard/trends/volume ────────────────────────────────────────
// total transaction count and USD volume per day for the last N days
// broken down by currency so frontend can show a stacked bar if needed

export const getVolumeTrend = async (req, res) => {
  try {
    const days = getDaysParam(req.query);

    // overall daily totals
    const totalsResult = await pool.query(
      `SELECT
          DATE(t.transaction_time) AS date,
          COUNT(*) AS transaction_count,
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
          ROUND(AVG(
            t.amount * CASE t.currency
              WHEN 'USD' THEN 1.0
              WHEN 'INR' THEN 0.012
              WHEN 'EUR' THEN 1.08
              WHEN 'GBP' THEN 1.27
              WHEN 'JPY' THEN 0.0067
              WHEN 'AED' THEN 0.27
              ELSE 1.0
            END
          )::numeric, 2) AS avg_transaction_usd
       FROM transactions t
       WHERE t.transaction_time >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY DATE(t.transaction_time)
       ORDER BY date ASC`,
      [days]
    );

    // breakdown by currency per day - for stacked bar chart
    const currencyResult = await pool.query(
      `SELECT
          DATE(t.transaction_time) AS date,
          t.currency,
          COUNT(*) AS transaction_count,
          ROUND(SUM(t.amount)::numeric, 2) AS total_amount
       FROM transactions t
       WHERE t.transaction_time >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY DATE(t.transaction_time), t.currency
       ORDER BY date ASC, t.currency ASC`,
      [days]
    );

    // group currency breakdown by date
    const currencyByDate = {};
    for (const row of currencyResult.rows) {
      const dateKey = row.date.toISOString().split("T")[0];
      if (!currencyByDate[dateKey]) currencyByDate[dateKey] = {};
      currencyByDate[dateKey][row.currency] = {
        transaction_count: parseInt(row.transaction_count),
        total_amount: parseFloat(row.total_amount),
      };
    }

    const data = totalsResult.rows.map((row) => {
      const dateKey = row.date.toISOString().split("T")[0];
      return {
        date: dateKey,
        transaction_count: parseInt(row.transaction_count),
        total_volume_usd: parseFloat(row.total_volume_usd),
        avg_transaction_usd: parseFloat(row.avg_transaction_usd),
        by_currency: currencyByDate[dateKey] || {},
      };
    });

    res.json({
      success: true,
      days,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("getVolumeTrend error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};