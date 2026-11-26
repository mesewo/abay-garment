import express from "express";
import axios from "axios";
import Order from "../../models/Order.js";
import { requireAuth } from "../../middleware/auth.js";

const router = express.Router();

router.post("/verify", requireAuth, async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: "Missing payment reference" });
  }
  if (!process.env.CHAPA_SECRET_KEY) {
    return res.status(500).json({ error: "Payment provider is not configured" });
  }

  try {
    const response = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } }
    );

    const data = response.data;

    if (data.status !== "success" || data.data?.status !== "success") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const order = await Order.findOne({ tx_ref: reference });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const isOwner = String(order.userId) === req.user.id;
    const isStaff = ["admin", "accountant"].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "You cannot verify this payment" });
    }

    // Chapa tells us the amount that was actually paid; make sure it matches.
    const paidAmount = Number(data.data.amount);
    if (Number.isFinite(paidAmount) && paidAmount + 0.01 < Number(order.totalAmount)) {
      return res.status(400).json({ error: "Paid amount does not match the order total" });
    }

    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      order.paymentId = reference;
      order.paymentPaidAt = new Date();
      if (order.orderStatus === "pending") order.orderStatus = "confirmed";
      await order.save();
    }

    return res.json({
      success: true,
      message: "Payment verified and order updated",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Payment verification error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Server error verifying payment" });
  }
});

export default router;
