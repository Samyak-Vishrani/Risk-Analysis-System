import express from "express";
import {
  getByCountry,
  getByLocation,
} from "../controllers/geography.controller.js";

const router = express.Router();

router.get("/by-country", getByCountry);
router.get("/by-location", getByLocation);

export default router;