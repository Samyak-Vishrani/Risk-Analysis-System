import express from "express";
import pool from "./db/db.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Transaction Service Running");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Database connection failed");
  }
});

import transactionRoutes from "./routes/transactionRoutes.js";

app.use("/api", transactionRoutes);

export default app;