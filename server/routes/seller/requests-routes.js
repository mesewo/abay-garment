import express from "express";
import ProductRequest from "../../models/ProductRequest.js";

const router = express.Router();

router.delete("/requests/:id", async (req, res) => {
  try {
    const request = await ProductRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (String(request.seller) !== req.user.id && String(request.requestedBy) !== req.user.id) {
      return res
        .status(403)
        .json({ message: "This request does not belong to you" });
    }
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending requests can be deleted" });
    }
    await request.deleteOne();
    return res.json({ message: "Request deleted" });
  } catch (err) {
    console.error("Delete request error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
