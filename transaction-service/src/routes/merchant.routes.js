import express from "express";
import {
  getTopFraudMerchants,
  getMerchantsByCategory,
  getMerchantById,
} from "../controllers/merchants.controller.js";

const router = express.Router();

router.get("/top-fraud", getTopFraudMerchants);
router.get("/by-category", getMerchantsByCategory);
router.get("/:id", getMerchantById);

export default router;