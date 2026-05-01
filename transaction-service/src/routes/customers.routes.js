import express from "express";
import {
  getTopRiskCustomers,
  getCustomersByAgeBracket,
  getCustomerById,
} from "../controllers/customers.controller.js";

const router = express.Router();

router.get("/top-risk", getTopRiskCustomers);
router.get("/by-age-bracket", getCustomersByAgeBracket);
router.get("/:id", getCustomerById);

export default router;