import pool from "../db/db.js";

const USD_RATES = {
  USD: 1.0,
  INR: 0.012,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  AED: 0.27,
};

const BASE_SELECT = `
  SELECT
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
    t.customer_id,
    t.merchant_id,
    t.device_id,

    r.fraud_probability,
    r.risk_level,
    r.action,
    r.scored_at,
    r.reviewed,

    m.merchant_name,
    m.category AS merchant_category,
    m.country AS merchant_country,
    m.risk_rating AS merchant_risk_rating,

    c.name AS customer_name,
    c.age AS customer_age,
    c.income AS customer_income,

    d.device_type,
    d.registered_at AS device_registered_at
  FROM transactions t
  LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
  LEFT JOIN merchants m ON m.merchant_id = t.merchant_id
  LEFT JOIN customers c ON c.customer_id = t.customer_id
  LEFT JOIN devices d ON d.device_id = t.device_id
`;

// ─── GET /transactions/recent ─────────────────────────────────────────────
// Live feed - last N transactions ordered by transaction_time descending
// optional query param: limit (default 20, max 100)

export const getRecentTransactions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const result = await pool.query(
      `${BASE_SELECT}
       ORDER BY t.transaction_time DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    console.error("getRecentTransactions error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /transactions/:id ────────────────────────────────────────────────
// Single transaction - full detail view including all joined fields

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `${BASE_SELECT}
       WHERE t.transaction_id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("getTransactionById error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /transactions ────────────────────────────────────────────────────
// Paginated + filtered table
// query params:
//  page (default 1)
//  limit (default 20, max 100)
//  risk_level (LOW | MEDIUM | HIGH | CRITICAL)
//  action (ALLOW | REVIEW | BLOCK)
//  currency (USD | INR | EUR | GBP | JPY | AED)
//  is_fraud (true | false)
//  reviewed (true | false)
//  from (ISO date string - transaction_time >=)
//  to (ISO date string - transaction_time <=)
//  min_amount (filter by amount_usd >=)
//  max_amount (filter by amount_usd <=)

export const getTransactions = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // build WHERE clauses dynamically based on which filters were passed
    const conditions = [];
    const params = [];

    if (req.query.risk_level) {
      params.push(req.query.risk_level.toUpperCase());
      conditions.push(`r.risk_level = $${params.length}`);
    }

    if (req.query.action) {
      params.push(req.query.action.toUpperCase());
      conditions.push(`r.action = $${params.length}`);
    }

    if (req.query.currency) {
      params.push(req.query.currency.toUpperCase());
      conditions.push(`t.currency = $${params.length}`);
    }

    if (req.query.is_fraud !== undefined) {
      params.push(req.query.is_fraud === "true");
      conditions.push(`t.is_fraud = $${params.length}`);
    }

    if (req.query.reviewed !== undefined) {
      params.push(req.query.reviewed === "true");
      conditions.push(`r.reviewed = $${params.length}`);
    }

    if (req.query.from) {
      params.push(req.query.from);
      conditions.push(`t.transaction_time >= $${params.length}`);
    }

    if (req.query.to) {
      params.push(req.query.to);
      conditions.push(`t.transaction_time <= $${params.length}`);
    }

    if (req.query.min_amount) {
      // filter on usd equivalent - compute inline
      params.push(parseFloat(req.query.min_amount));
      conditions.push(`
        (t.amount * CASE t.currency
          WHEN 'USD' THEN 1.0 WHEN 'INR' THEN 0.012
          WHEN 'EUR' THEN 1.08 WHEN 'GBP' THEN 1.27
          WHEN 'JPY' THEN 0.0067 WHEN 'AED' THEN 0.27
          ELSE 1.0 END) >= $${params.length}
      `);
    }

    if (req.query.max_amount) {
      params.push(parseFloat(req.query.max_amount));
      conditions.push(`
        (t.amount * CASE t.currency
          WHEN 'USD' THEN 1.0 WHEN 'INR' THEN 0.012
          WHEN 'EUR' THEN 1.08 WHEN 'GBP' THEN 1.27
          WHEN 'JPY' THEN 0.0067 WHEN 'AED' THEN 0.27
          ELSE 1.0 END) <= $${params.length}
      `);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // total count for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM transactions t
       LEFT JOIN risk_scores r ON r.transaction_id = t.transaction_id
       LEFT JOIN merchants m ON m.merchant_id = t.merchant_id
       LEFT JOIN customers c ON c.customer_id = t.customer_id
       LEFT JOIN devices d ON d.device_id = t.device_id
       ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // data query - same filters, add pagination
    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const dataResult = await pool.query(
      `${BASE_SELECT}
       ${whereClause}
       ORDER BY t.transaction_time DESC
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
      data: dataResult.rows,
    });
  } catch (err) {
    console.error("getTransactions error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};


// import pool from "../db/db.js";
// import { transactionQueue } from "../queue/transactionQueue.js";

// export const createTransaction = async (req, res) => {
//   try {
//     const { customer_id, merchant_id, device_id, amount, currency, location } =
//       req.body;

//     if (!customer_id || !merchant_id || !device_id || !amount || !currency) {
//       return res.status(400).json({
//         message: "Missing required fields",
//       });
//     }

//     if (amount <= 0) {
//       return res.status(400).json({
//         message: "Amount must be greater than 0",
//       });
//     }

//     const customerCheck = await pool.query(
//       "SELECT 1 FROM customers WHERE customer_id = $1",
//       [customer_id],
//     );
//     if (customerCheck.rowCount === 0) {
//       return res.status(400).json({
//         message: "Invalid customer_id",
//       });
//     }

//     const merchantCheck = await pool.query(
//       "SELECT 1 FROM merchants WHERE merchant_id = $1",
//       [merchant_id],
//     );
//     if (merchantCheck.rowCount === 0) {
//       return res.status(400).json({
//         message: "Invalid merchant_id",
//       });
//     }

//     const deviceCheck = await pool.query(
//       "SELECT 1 FROM devices WHERE device_id = $1 AND customer_id = $2",
//       [device_id, customer_id]
//     );
//     if (deviceCheck.rowCount === 0) {
//       return res.status(400).json({
//         message: "Device does not belong to customer"
//       });
//     }

//     const query = `
//       INSERT INTO transactions 
//       (customer_id, merchant_id, device_id, amount, currency, location, transaction_time, is_fraud)
//       VALUES ($1,$2,$3,$4,$5,$6,NOW(),false)
//       RETURNING transaction_id
//     `;

//     const values = [
//       customer_id,
//       merchant_id,
//       device_id,
//       amount,
//       currency,
//       location || null,
//     ];

//     const result = await pool.query(query, values);
//     const transactionId = result.rows[0].transaction_id;
//     // console.log(result);

//     await transactionQueue.add("processTransaction", {
//       transaction_id: transactionId,
//     });

//     return res.status(201).json({
//       message: "Transaction created",
//       transaction_id: transactionId,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };

// export const getTransactionById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id || isNaN(id)) {
//       return res.status(400).json({
//         message: "Invalid transaction ID"
//       });
//     }

//     const query = `
//       SELECT 
//         t.*,
//         c.name AS customer_name,
//         m.merchant_name, m.category
//     FROM transactions t
//     JOIN customers c ON t.customer_id = c.customer_id
//     JOIN merchants m ON t.merchant_id = m.merchant_id
//     WHERE t.transaction_id = $1
//     `;

//     const result = await pool.query(query, [id]);

//     if (result.rowCount === 0) {
//       return res.status(404).json({
//         message: "Transaction not found"
//       });
//     }

//     // console.log(result);

//     return res.status(200).json({
//       transaction: result.rows[0]
//     });

//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       message: "Internal server error",
//     });
//   }
// };