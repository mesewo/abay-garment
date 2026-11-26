import express from "express";
import User from "../../models/User.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Store keepers only need seller accounts for store assignment.
    const role = req.user.role === "admin" ? req.query.role : "seller";
    const users = await User.find(role ? { role } : {}).select(
      "userName email role isBlocked"
    );
    res.json({ success: true, users });
  } catch (err) {
    console.error("Storekeeper users error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

export default router;
