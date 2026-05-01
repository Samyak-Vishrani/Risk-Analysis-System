import express from "express";
import {
  getMetrics,
  getChampion,
  getFeatures,
  getModelHealth,
} from "../controllers/model.controller.js";

const router = express.Router();

router.get("/metrics", getMetrics);
router.get("/champion", getChampion);
router.get("/features", getFeatures);
router.get("/health", getModelHealth);

export default router;