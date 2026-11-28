import Order from "../models/Order.js";
import Product from "../models/Product.js";
import StoreProduct from "../models/StoreProduct.js";

export const releaseOrderStock = async (order) => {
  const id = typeof order === "string" ? order : order?._id;
  if (!id) return false;

  const claimed = await Order.findOneAndUpdate(
    { _id: id, stockReleased: { $ne: true }, paymentStatus: { $ne: "paid" } },
    { $set: { stockReleased: true } },
    { new: true }
  );
  if (!claimed) return false;

  for (const item of claimed.reservedStock || []) {
    await StoreProduct.updateOne(
      { _id: item.storeProductId },
      { $inc: { quantity: item.quantity } }
    );
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { soldCount: -item.quantity } }
    );
  }
  return true;
};

export const cancelExpiredChapaOrders = async () => {
  const expired = await Order.find({
    paymentMethod: "chapa",
    paymentStatus: "pending",
    orderStatus: "pending",
    expiresAt: { $lte: new Date() },
  }).select("_id");

  for (const order of expired) {
    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "pending", orderStatus: "pending", expiresAt: { $lte: new Date() } },
      { $set: { orderStatus: "cancelled", orderUpdateDate: new Date() } },
      { new: true }
    );
    if (cancelled) await releaseOrderStock(cancelled);
  }
};
