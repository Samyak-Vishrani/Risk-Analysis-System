import { Worker } from "bullmq";
import IORedis from "ioredis";
import pool from "./db/db.js";

const connection = new IORedis({ host: "127.0.0.1", port: 6379 });

const CURRENCY_MAX = {
  USD: 5000,
  INR: 200000,
  EUR: 4000,
  GBP: 3500,
  JPY: 300000,
  AED: 15000,
};

/* individual signal scorers */
function scoreAmount(amount, currency) {
  const max = CURRENCY_MAX[currency] ?? 5000;
  const ratio = amount / max;
  
  if (ratio > 0.85) return 0.55;
  if (ratio > 0.65) return 0.35;
  if (ratio > 0.40) return 0.15;
  return 0.0;
}

function scoreMerchant(merchantRisk) {
  if (merchantRisk >= 0.8) return 0.50;
  if (merchantRisk >= 0.6) return 0.30;
  if (merchantRisk >= 0.4) return 0.15;
  return 0.05;
}

function scoreDevice(deviceRegisteredAt) {
  const ageMs = Date.now() - new Date(deviceRegisteredAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 1)   return 0.40; 
  if (ageDays < 7)   return 0.25;
  if (ageDays < 30)  return 0.10;
  return 0.0;
}

function scoreCustomer(age, income, transactionAmount, currency) {
  /* flag if transaction is disproportionate to income */
  const max = CURRENCY_MAX[currency] ?? 5000;
  const normalizedAmount = amount / max;

  let score = 0.0;

  /* very young or very old accounts are slightly elevated */
  if (age < 20 || age > 80) score += 0.05;

  /* spending a lot relative to income bracket */
  if (income < 30000 && normalizedAmount > 0.5) score += 0.20;
  else if (income < 60000 && normalizedAmount > 0.7) score += 0.15;
  else if (normalizedAmount > 0.9) score += 0.10;

  return Math.min(score, 0.30);
}

function correlationMultiplier(signals) {
  const highCount = signals.filter(s => s >= 0.30).length;
  if (highCount >= 3) return 1.50;
  if (highCount >= 2) return 1.25;
  return 1.0;
}

function computeFraudProbability(tx, merchant, device) {
  const BASE = 0.02;

  const signals = {
    amount:   scoreAmount(tx.amount, tx.currency),
    merchant: scoreMerchant(parseFloat(merchant.risk_rating)),
    device:   scoreDevice(device.registered_at),
    customer: scoreCustomer(tx.customer_age, tx.customer_income, tx.amount, tx.currency),
  };

  /* weighted sum: merchant and amount carry most signal */
  const weighted =
    signals.amount   * 0.35 +
    signals.merchant * 0.30 +
    signals.device   * 0.20 +
    signals.customer * 0.15;

  const multiplier = correlationMultiplier(Object.values(signals));
  const raw = BASE + weighted * multiplier;
  return Math.min(parseFloat(raw.toFixed(4)), 1.0);
}

function classifyRisk(prob) {
  if (prob > 0.85) return "CRITICAL";
  if (prob > 0.65) return "HIGH";
  if (prob > 0.35) return "MEDIUM";
  return "LOW";
}


const worker = new Worker(
  "transactionQueue",
  async (job) => {
    const { transaction_id } = job.data;
    console.log("Processing transaction:", transaction_id);

    const txResult = await pool.query(
      `SELECT t.*, c.age AS customer_age, c.income AS customer_income
       FROM transactions t
       JOIN customers c ON c.customer_id = t.customer_id
       WHERE t.transaction_id = $1`,
      [transaction_id]
    );

    if (txResult.rowCount === 0) throw new Error("Transaction not found");
    const tx = txResult.rows[0];

    const merchantResult = await pool.query(
      "SELECT risk_rating FROM merchants WHERE merchant_id = $1",
      [tx.merchant_id]
    );
    const merchant = merchantResult.rows[0] ?? { risk_rating: 0.3 };

    const deviceResult = await pool.query(
      "SELECT registered_at FROM devices WHERE device_id = $1",
      [tx.device_id]
    );
    const device = deviceResult.rows[0] ?? { registered_at: new Date() };

    const fraud_probability = computeFraudProbability(tx, merchant, device);
    const risk_level = classifyRisk(fraud_probability);

    await pool.query(
      `INSERT INTO risk_scores (transaction_id, fraud_probability, risk_level, scored_at)
       VALUES ($1, $2, $3, NOW())`,
      [transaction_id, fraud_probability, risk_level]
    );

    console.log(`Transaction ${transaction_id} scored: ${fraud_probability} → ${risk_level}`);
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});