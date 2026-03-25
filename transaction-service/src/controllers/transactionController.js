import pool from "../db/db.js";
import { transactionQueue } from "../queue/transactionQueue.js";

export const createTransaction = async (req, res) => {
  try {
    const { customer_id, merchant_id, device_id, amount, currency, location } =
      req.body;

    if (!customer_id || !merchant_id || !device_id || !amount || !currency) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    const customerCheck = await pool.query(
      "SELECT 1 FROM customers WHERE customer_id = $1",
      [customer_id],
    );
    if (customerCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Invalid customer_id",
      });
    }

    const merchantCheck = await pool.query(
      "SELECT 1 FROM merchants WHERE merchant_id = $1",
      [merchant_id],
    );
    if (merchantCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Invalid merchant_id",
      });
    }

    const deviceCheck = await pool.query(
      "SELECT 1 FROM devices WHERE device_id = $1 AND customer_id = $2",
      [device_id, customer_id]
    );
    if (deviceCheck.rowCount === 0) {
      return res.status(400).json({
        message: "Device does not belong to customer"
      });
    }

    const query = `
      INSERT INTO transactions 
      (customer_id, merchant_id, device_id, amount, currency, location, transaction_time, is_fraud)
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),false)
      RETURNING transaction_id
    `;

    const values = [
      customer_id,
      merchant_id,
      device_id,
      amount,
      currency,
      location || null,
    ];

    const result = await pool.query(query, values);
    const transactionId = result.rows[0].transaction_id;
    // console.log(result);

    await transactionQueue.add("processTransaction", {
      transaction_id: transactionId,
    });

    return res.status(201).json({
      message: "Transaction created",
      transaction_id: transactionId,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "Invalid transaction ID"
      });
    }

    const query = `
      SELECT 
        t.*,
        c.name AS customer_name,
        m.merchant_name, m.category
    FROM transactions t
    JOIN customers c ON t.customer_id = c.customer_id
    JOIN merchants m ON t.merchant_id = m.merchant_id
    WHERE t.transaction_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Transaction not found"
      });
    }

    // console.log(result);

    return res.status(200).json({
      transaction: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};