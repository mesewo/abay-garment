import express from "express";
import Notification from "../models/Notification.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { forRole, type } = req.query;
    // Non-admins can only read notifications addressed to their own role.
    const role = req.user.role === "admin" ? forRole : req.user.role;
    const query = {};
    if (role) query.forRole = role;
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .populate({ path: "product", select: "title image" })
      .sort({ createdAt: -1 });

    return res.json({ notifications });
  } catch (error) {
    console.error("Notifications error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    if (req.user.role !== "admin" && notification.forRole !== req.user.role) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot delete this notification" });
    }

    await notification.deleteOne();
    return res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
});

export default router;
