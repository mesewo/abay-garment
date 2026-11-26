import express from "express";
import Order from "../../models/Order.js";
import { requireRole } from "../../middleware/auth.js";

const router = express.Router();

const STAFF_ROLES = ["store_keeper", "seller", "admin", "accountant"];

router.get("/", requireRole(...STAFF_ROLES), async (req, res) => {
  const { ref } = req.query;
  if (!ref) return res.status(400).json({ error: "Missing payment reference" });

  try {
    const order = await Order.findOne({ paymentId: ref });
    if (!order) return res.status(404).json({ error: "Order not found" });

    return res.json({
      orderId: order._id,
      paid: order.paymentStatus === "paid",
      items: order.orderItems,
      isQRVerified: order.isQRVerified,
      paidAt: order.paymentPaidAt,
      userId: order.userId,
      store: order.store,
    });
  } catch (error) {
    console.error("QR lookup error:", error);
    return res.status(500).json({ error: "Server error fetching order" });
  }
});

router.post("/verify", requireRole(...STAFF_ROLES), async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: "Missing order ID" });

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.paymentStatus !== "paid") {
      return res
        .status(400)
        .json({ error: "This order has not been paid for yet" });
    }

    if (order.isQRVerified) {
      return res.json({ message: "Order was already verified", orderId: order._id });
    }

    order.isQRVerified = true;
    order.orderUpdateDate = new Date();
    await order.save();

    return res.json({ message: "Order marked as verified", orderId: order._id });
  } catch (error) {
    console.error("QR verify error:", error);
    return res.status(500).json({ error: "Server error updating order" });
  }
});

export default router;
