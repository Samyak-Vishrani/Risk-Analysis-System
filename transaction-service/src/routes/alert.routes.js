import express from "express";
import {
  getCriticalAlerts,
  getAlertsCount,
} from "../controllers/alert.controller.js";

const router = express.Router();

router.get("/critical", getCriticalAlerts);
router.get("/count", getAlertsCount);

export default router;