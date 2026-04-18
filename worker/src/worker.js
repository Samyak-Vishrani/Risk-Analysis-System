import { Worker } from "bullmq";
import IORedis from "ioredis";
import pool from "./db/db.js";

const connection = new IORedis({ host: "127.0.0.1", port: 6379 });
const ML_FASTAPI_URL = process.env.ML_FASTAPI_URL || "http://localhost:8000";

const getAction = (risk_level) => {
  return {
    LOW: "ALLOW",
    MEDIUM: "REVIEW",
    HIGH: "REVIEW",
    CRITICAL: "BLOCK"
  }[risk_level];
};

const worker = new Worker(
  "transactionQueue",
  async (job) => {
    const { transaction_id } = job.data;
    console.log("Processing transaction:", transaction_id);

    const txResult = await pool.query(
      `SELECT t.*, c.age AS customer_age, c.income AS customer_income,
        EXTRACT(HOUR FROM t.transaction_time) AS tx_hour,
        EXTRACT(DOW  FROM t.transaction_time) AS tx_dow,
        EXTRACT(DAY  FROM (t.transaction_time - c.account_created)) AS account_age_days
      FROM transactions t
      JOIN customers c ON c.customer_id = t.customer_id
      WHERE t.transaction_id = $1`,
      [transaction_id]
    );
    if (txResult.rowCount === 0) throw new Error("Transaction not found");
    const tx = txResult.rows[0];

    const merchantResult = await pool.query(
      "SELECT risk_rating, category, country FROM merchants WHERE merchant_id = $1",
      [tx.merchant_id]
    );
    const merchant = merchantResult.rows[0] ?? { risk_rating: 0.3, category: "unknown", country: "unknown" };

    const deviceResult = await pool.query(
      "SELECT registered_at, device_type FROM devices WHERE device_id = $1",
      [tx.device_id]
    );
    const device = deviceResult.rows[0] ?? { registered_at: new Date(), device_type: "unknown" };
    const deviceAgeDays = (Date.now() - new Date(device.registered_at).getTime()) / 86400000

    const mlResponse = await fetch(`${ML_FASTAPI_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_id: tx.transaction_id,
        amount: tx.amount,
        currency: tx.currency,
        tx_hour: Number(tx.tx_hour),
        tx_dow: Number(tx.tx_dow),
        merchant_risk: parseFloat(merchant.risk_rating),
        merchant_category: merchant.category,
        merchant_country: merchant.country,
        customer_age: tx.customer_age,
        customer_income: parseFloat(tx.customer_income),
        account_age_days: Number(tx.account_age_days),
        device_age_days: parseFloat(deviceAgeDays.toFixed(4)),
        device_type: device.device_type,
      })
    })

    if (!mlResponse.ok) {
      const err = await mlResponse.text();
      throw new Error(`ML service error ${mlResponse.status}: ${err}`);
    }

    const result = await mlResponse.json();
    const action = getAction(result.risk_level);
    const reviewed = action === "ALLOW";

    await pool.query(
      `INSERT INTO risk_scores (transaction_id, fraud_probability, risk_level, action, scored_at, reviewed)
      VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [transaction_id, result.fraud_probability, result.risk_level, action, reviewed]
    );

    console.log(`Transaction ${transaction_id} scored: ${result.fraud_probability} → ${result.risk_level} → ${action}`);
  
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});