import express from "express";
import {
  getRecentTransactions,
  getTransactionById,
  getTransactions,
} from "../controllers/transaction.controller.js";

const router = express.Router();

router.get("/", getTransactions);
router.get("/recent", getRecentTransactions);
router.get("/:id", getTransactionById);

export default router;