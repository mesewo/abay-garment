import express from "express";
import axios from "axios";
import { requireAuth } from "../../middleware/auth.js";
import Order from "../../models/Order.js";

const router = express.Router();

router.post("/initiate", requireAuth, async (req, res) => {
  try {
    const { orderId, tx_ref } = req.body;

    if (!orderId && !tx_ref) {
      return res.status(400).json({ success: false, message: "Transaction reference or order id is required." });
    }
    if (!process.env.CHAPA_SECRET_KEY) {
      return res
        .status(500)
        .json({ success: false, message: "Payment provider is not configured." });
    }

    const firstOrder = tx_ref
      ? await Order.findOne({ tx_ref })
      : await Order.findById(orderId);
    if (!firstOrder) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const reference = firstOrder.tx_ref;
    const orders = await Order.find({ tx_ref: reference });
    if (!orders.length || !orders.every((order) => String(order.userId) === req.user.id)) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot pay for this order." });
    }
    const now = new Date();
    if (orders.some((order) => order.paymentStatus !== "pending" || order.paymentMethod !== "chapa" || order.orderStatus !== "pending" || (order.expiresAt && order.expiresAt <= now))) {
      return res
        .status(409)
        .json({ success: false, message: "These orders are not available for payment." });
    }

    const amount = Number(orders.reduce((sum, order) => sum + Number(order.totalAmount), 0).toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Order total is invalid." });
    }

    const [firstName = "Customer", ...rest] = (req.user.userName || "Customer").split(" ");
    const lastName = rest.join(" ") || "User";
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const response = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: String(amount),
        currency: "ETB",
        email: req.user.email,
        first_name: firstName,
        last_name: lastName,
        tx_ref: reference,
        return_url: `${clientUrl}/shop/payment-success?from=chapa`,
        ...(process.env.API_PUBLIC_URL ? { callback_url: `${process.env.API_PUBLIC_URL.replace(/\/$/, "")}/api/payment/webhook` } : {}),
      },
      {
        headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error("Chapa init error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Could not start the payment. Please try again.",
    });
  }
});

export default router;
