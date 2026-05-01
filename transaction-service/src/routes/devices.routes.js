import express from "express";
import {
  getDevicesByAge,
  getTopRiskDevices,
} from "../controllers/devices.controller.js";

const router = express.Router();

router.get("/by-age", getDevicesByAge);
router.get("/top-risk", getTopRiskDevices);

export default router;