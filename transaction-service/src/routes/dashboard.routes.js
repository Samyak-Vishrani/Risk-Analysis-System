import express from "express";
import {
  getSummary,
  getSummaryActions,
  getSummaryRiskLevels,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/summary", getSummary);
router.get("/summary/actions", getSummaryActions);
router.get("/summary/risk-levels", getSummaryRiskLevels);

export default router;