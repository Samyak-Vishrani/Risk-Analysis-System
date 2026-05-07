import express from "express";
import cors from "cors";
import pool from "./db/db.js";

const app = express();

app.use(cors());
// app.use(cors({
//   origin: "http://localhost:5173",
//   credentials: true
// }));
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

// import transactionRoutes from "./routes/transaction.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import trendsRoutes from "./routes/trends.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import merchantRoutes from "./routes/merchant.routes.js";
import customerRoutes from "./routes/customers.routes.js";
import deviceRoutes from "./routes/devices.routes.js";
import reviewRoutes from "./routes/reviews.routes.js";
import geographyRoutes from "./routes/geography.routes.js";
import modelRoutes from "./routes/model.routes.js";
import alertRoutes from "./routes/alert.routes.js";

app.use("/api", transactionRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/dashboard/trends", trendsRoutes);
app.use("/transactions", transactionRoutes);
app.use("/dashboard/merchants", merchantRoutes);
app.use("/dashboard/customers", customerRoutes);
app.use("/dashboard/devices", deviceRoutes);
app.use("/reviews", reviewRoutes);
app.use("/dashboard/geography", geographyRoutes);
app.use("/model", modelRoutes);
app.use("/alerts", alertRoutes);

export default app;