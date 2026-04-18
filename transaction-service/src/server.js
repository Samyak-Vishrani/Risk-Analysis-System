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

import transactionRoutes from "./routes/transaction.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import trendsRoutes from "./routes/trends.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

app.use("/api", transactionRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/dashboard/trends", trendsRoutes);
app.use("/transactions", transactionRoutes);

export default app;