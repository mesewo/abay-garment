import crypto from "crypto";
import express from "express";
import axios from "axios";
import Order from "../../models/Order.js";
import { requireAuth } from "../../middleware/auth.js";
import StoreProduct from "../../models/StoreProduct.js";
import Product from "../../models/Product.js";

const router = express.Router();

export const verifyChapaPayment = async (reference) => {
  if (!process.env.CHAPA_SECRET_KEY) throw new Error("Payment provider is not configured");
  const response = await axios.get(
    `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } }
  );
  const data = response.data;
  if (data.status !== "success" || data.data?.status !== "success") {
    return { ok: false, status: 400, error: "Payment not successful" };
  }

  const orders = await Order.find({ tx_ref: reference });
  if (!orders.length) return { ok: false, status: 404, error: "Order not found" };
  const paidAmount = Number(data.data.amount);
  const roundedPaidAmount = Number(paidAmount.toFixed(2));
  const currency = String(data.data.currency || "").toUpperCase();
  const total = Number(orders.reduce((sum, order) => sum + Number(order.totalAmount), 0).toFixed(2));
  if (!Number.isFinite(paidAmount) || !Number.isFinite(total) || Number((roundedPaidAmount - total).toFixed(2)) < -0.01) {
    return { ok: false, status: 400, error: "Paid amount does not match the order total" };
  }
  if (currency !== "ETB") return { ok: false, status: 400, error: "Payment currency must be ETB" };

  const now = new Date();
  for (const order of orders) {
    if (order.paymentStatus === "paid") continue;
    const claimed = await Order.updateOne(
      { _id: order._id, paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "paid", paymentId: reference, paymentPaidAt: now } }
    );
    if (!claimed.modifiedCount) continue;
    const expired = order.expiresAt && order.expiresAt <= now;
    const eligible = order.orderStatus === "pending" && !expired && !order.stockReleased;
    if (eligible) {
      await Order.updateOne({ _id: order._id }, { $set: { orderStatus: "confirmed", orderUpdateDate: now, needsRefund: false } });
      continue;
    }

    let reserved = true;
    const decremented = [];
    if (order.stockReleased) {
      for (const item of order.reservedStock || []) {
        const updated = await StoreProduct.updateOne({ _id: item.storeProductId, quantity: { $gte: item.quantity } }, { $inc: { quantity: -item.quantity } });
        if (!updated.modifiedCount) { reserved = false; break; }
        decremented.push(item);
      }
      if (!reserved) {
        for (const item of decremented) {
          await StoreProduct.updateOne({ _id: item.storeProductId }, { $inc: { quantity: item.quantity } });
        }
      } else {
        for (const item of decremented) await Product.updateOne({ _id: item.productId }, { $inc: { soldCount: item.quantity } });
      }
    }
    if (reserved) {
      await Order.updateOne({ _id: order._id }, { $set: { orderStatus: "confirmed", orderUpdateDate: now, stockReleased: false, needsRefund: false } });
    } else {
      await Order.updateOne({ _id: order._id }, { $set: { needsRefund: true } });
      console.error(`Chapa payment ${reference} is paid but stock could not be re-reserved; refund required.`);
    }
  }
  const updatedOrders = await Order.find({ tx_ref: reference }).select("_id paymentStatus");
  return { ok: true, orderIds: updatedOrders.map((order) => order._id) };
};

router.post("/verify", requireAuth, async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: "Missing payment reference" });
  try {
    const orders = await Order.find({ tx_ref: reference }).select("userId");
    if (!orders.length) return res.status(404).json({ error: "Order not found" });
    const isOwner = orders.every((order) => String(order.userId) === req.user.id);
    const isStaff = ["admin", "accountant"].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ error: "You cannot verify this payment" });
    const result = await verifyChapaPayment(reference);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json({ success: true, message: "Payment verified and orders updated", orderIds: result.orderIds, orderId: result.orderIds[0] });
  } catch (error) {
    console.error("Payment verification error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Server error verifying payment" });
  }
});

export const webhookRouter = express.Router();
webhookRouter.post("/", async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (!Buffer.isBuffer(req.body)) return res.sendStatus(400);
  const secret = process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY;
  if (!secret) return res.sendStatus(500);
  let payload;
  try { payload = JSON.parse(rawBody.toString("utf8")); } catch { return res.sendStatus(400); }

  const signatures = [req.get("x-chapa-signature"), req.get("chapa-signature")].filter(Boolean);
  const payloadDigest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const secretDigest = crypto.createHmac("sha256", secret).update(secret).digest("hex");
  const matches = (provided, expected) => {
    const left = Buffer.from(provided);
    const right = Buffer.from(expected);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  };
  if (!signatures.some((signature) => matches(signature, payloadDigest) || matches(signature, secretDigest))) {
    return res.sendStatus(401);
  }
  const reference = payload.tx_ref || payload.data?.tx_ref || payload.reference || payload.data?.reference;
  if (!reference) return res.sendStatus(200);
  try { await verifyChapaPayment(reference); return res.sendStatus(200); }
  catch (error) { console.error(`Chapa webhook verification error for ${reference}:`, error.response?.data || error.message); return res.sendStatus(200); }
});

webhookRouter.get("/", async (req, res) => {
  const reference = req.query.trx_ref || req.query.tx_ref;
  if (reference) {
    try { await verifyChapaPayment(String(reference)); }
    catch (error) { console.error(`Chapa webhook verification error for ${reference}:`, error.response?.data || error.message); }
  }
  return res.sendStatus(200);
});

export default router;
