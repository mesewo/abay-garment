import express from "express";
import {
  addFeatureImage,
  getFeatureImages,
  deleteFeatureImage,
} from "../../controllers/common/feature-controller.js";
import { requireRole } from "../../middleware/auth.js";

const router = express.Router();

// Feature images are public to read, but only staff can change them.
router.post("/add", requireRole("admin", "factman"), addFeatureImage);
router.get("/get", getFeatureImages);
router.delete(
  "/delete/:id",
  requireRole("admin", "factman"),
  deleteFeatureImage
);

export default router;