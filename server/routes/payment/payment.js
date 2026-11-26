import express from "express";
import axios from "axios";
import { requireAuth } from "../../middleware/auth.js";
import Order from "../../models/Order.js";

const router = express.Router();

router.post("/initiate", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order id is required." });
    }
    if (!process.env.CHAPA_SECRET_KEY) {
      return res
        .status(500)
        .json({ success: false, message: "Payment provider is not configured." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.userId) !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot pay for this order." });
    }
    if (order.paymentStatus === "paid") {
      return res
        .status(409)
        .json({ success: false, message: "This order has already been paid." });
    }

    // Amount always comes from the server-side order total.
    const amount = order.totalAmount;
    if (!amount || amount <= 0) {
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
        tx_ref: order.tx_ref,
        return_url: `${clientUrl}/shop/payment-success?from=chapa`,
      },
      {
        headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
      }
    );

    order.paymentMethod = "chapa";
    await order.save();

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
