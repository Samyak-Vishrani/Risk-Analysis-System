import express from "express";
import { createTransaction, getTransactionById } from "../controllers/transactionController.js";

const router = express.Router();

router.post("/transaction", createTransaction);
router.get("/transaction/:id", getTransactionById);

export default router;