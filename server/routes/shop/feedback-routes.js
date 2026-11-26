import express from "express";
import {
  submitFeedback,
  getMyFeedback,
  getProductFeedback,
  getAllFeedback,
} from "../../controllers/shop/feedback-controller.js";
import { authMiddleware } from "../../controllers/auth/auth-controller.js";

const router = express.Router();

// Authenticated buyers only
router.post("/submit", authMiddleware, submitFeedback);
router.get("/my-feedback", authMiddleware, getMyFeedback);

// Public reads
router.get("/", getAllFeedback);
router.get("/:productId", getProductFeedback);

export default router;
