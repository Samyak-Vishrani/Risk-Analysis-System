import express from "express";
import {
  getCriticalAlerts,
  getAlertsCount,
} from "../controllers/alerts.controller.js";

const router = express.Router();

router.get("/critical", getCriticalAlerts);
router.get("/count", getAlertsCount);

export default router;