import express from "express";
import {
  getPendingReviews,
  getPendingReviewsCount,
  resolveReview,
  getReviewHistory,
} from "../controllers/reviews.controller.js";

const router = express.Router();

router.get("/pending", getPendingReviews);
router.get("/pending/count", getPendingReviewsCount);
router.patch("/:transaction_id/resolve", resolveReview);
router.get("/history", getReviewHistory);

export default router;