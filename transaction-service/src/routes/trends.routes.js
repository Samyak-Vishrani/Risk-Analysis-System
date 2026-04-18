import express from "express";
import {
  getFraudRateTrend,
  getActionsTrend,
  getAmountAtRiskTrend,
  getVolumeTrend,
} from "../controllers/trends.controller.js";

const router = express.Router();

router.get("/fraud-rate", getFraudRateTrend);
router.get("/actions", getActionsTrend);
router.get("/amount-at-risk", getAmountAtRiskTrend);
router.get("/volume", getVolumeTrend);

export default router;