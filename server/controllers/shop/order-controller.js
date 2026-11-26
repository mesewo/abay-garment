import crypto from "crypto";
import Order from "../../models/Order.js";
import Cart from "../../models/Cart.js";
import Product from "../../models/Product.js";
import StoreProduct from "../../models/StoreProduct.js";
import User from "../../models/User.js";

const toPositiveInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const unitPriceOf = (product) =>
  product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;

/**
 * Decrements the store allocation with a conditional update so concurrent
 * checkouts cannot oversell. Factory stock is only moved when a storekeeper
 * approves a stock request, so a store sale must not deduct it again.
 */
const reserveStock = async (lines) => {
  const reserved = [];

  for (const line of lines) {
    const storeUpdate = await StoreProduct.findOneAndUpdate(
      { _id: line.storeProductId, quantity: { $gte: line.quantity } },
      { $inc: { quantity: -line.quantity } },
      { new: true }
    );

    if (!storeUpdate) {
      await releaseStock(reserved);
      return { ok: false, message: `Not enough stock for ${line.title}.` };
    }

    await Product.updateOne(
      { _id: line.productId },
      { $inc: { soldCount: line.quantity } }
    );

    reserved.push(line);
  }

  return { ok: true };
};

const releaseStock = async (lines) => {
  for (const line of lines) {
    await StoreProduct.updateOne(
      { _id: line.storeProductId },
      { $inc: { quantity: line.quantity } }
    );
    await Product.updateOne(
      { _id: line.productId },
      { $inc: { soldCount: -line.quantity } }
    );
  }
};

export const createOrder = async (req, res) => {
  try {
    // Owner is always the authenticated user, never a client supplied id.
    const userId = req.user.id;
    const { cartId, cartItems, addressInfo, paymentMethod, isBulk } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Your cart is empty." });
    }

    if (
      !addressInfo ||
      !addressInfo.address ||
      !addressInfo.city ||
      !addressInfo.pincode ||
      !addressInfo.phone
    ) {
      return res
        .status(400)
        .json({ success: false, message: "A complete delivery address is required." });
    }

    // Rebuild every line from trusted database data. Client prices, titles and
    // seller ids are ignored.
    const lines = [];
    for (const item of cartItems) {
      const quantity = toPositiveInt(item.quantity);
      if (!item.productId || !item.storeId || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Each cart item needs a product, a store and a positive quantity.",
        });
      }

      const product = await Product.findById(item.productId);
      if (!product || product.isActive === false) {
        return res
          .status(404)
          .json({ success: false, message: "One of the products is no longer available." });
      }

      const storeProduct = await StoreProduct.findOne({
        product: product._id,
        store: item.storeId,
      });
      if (!storeProduct) {
        return res.status(404).json({
          success: false,
          message: `${product.title} is not available in the selected store.`,
        });
      }

      if (storeProduct.quantity < quantity) {
        return res.status(409).json({
          success: false,
          message: `Only ${storeProduct.quantity} of ${product.title} left in this store.`,
        });
      }

      lines.push({
        productId: product._id,
        storeId: storeProduct.store,
        sellerId: storeProduct.seller,
        storeProductId: storeProduct._id,
        title: product.title,
        image: product.image,
        price: unitPriceOf(product),
        quantity,
      });
    }

    const stockResult = await reserveStock(lines);
    if (!stockResult.ok) {
      return res.status(409).json({ success: false, message: stockResult.message });
    }

    const ordersMap = new Map();
    for (const line of lines) {
      const key = `${line.storeId}_${line.sellerId}`;
      if (!ordersMap.has(key)) ordersMap.set(key, []);
      ordersMap.get(key).push(line);
    }

    const storekeeperUser = isBulk
      ? await User.findOne({ role: "store_keeper" }).select("_id")
      : null;

    const createdOrders = [];
    for (const items of ordersMap.values()) {
      const { storeId, sellerId } = items[0];
      const orderItems = items.map((item) => ({
        productId: item.productId,
        title: item.title,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      }));

      const totalAmount = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const order = await Order.create({
        userId,
        cartId: undefined,
        orderItems,
        addressInfo: {
          addressId: addressInfo.addressId,
          address: addressInfo.address,
          city: addressInfo.city,
          pincode: addressInfo.pincode,
          phone: addressInfo.phone,
          notes: addressInfo.notes,
        },
        totalAmount,
        paymentMethod: paymentMethod === "chapa" ? "chapa" : "cash",
        paymentStatus: "pending",
        orderStatus: "pending",
        orderDate: new Date(),
        orderUpdateDate: new Date(),
        store: storeId,
        seller: sellerId,
        tx_ref: `order_${crypto.randomUUID()}`,
        type: isBulk ? "bulk" : "normal",
        storekeeper: storekeeperUser?._id,
      });

      createdOrders.push(order);
    }

    // Only delete a cart that actually belongs to the caller.
    if (cartId) {
      await Cart.deleteOne({ _id: cartId, userId });
    }

    return res.status(201).json({
      success: true,
      message: "Orders created successfully",
      orderIds: createdOrders.map((order) => order._id),
      tx_refs: createdOrders.map((order) => order.tx_ref),
      orders: createdOrders,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error while creating orders" });
  }
};

export const getAllOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Some error occurred!" });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found!" });
    }

    const isOwner = String(order.userId) === req.user.id;
    const isPrivileged = ["admin", "accountant", "store_keeper", "factman"].includes(
      req.user.role
    );
    const isAssignedSeller =
      req.user.role === "seller" && String(order.seller) === req.user.id;

    if (!isOwner && !isPrivileged && !isAssignedSeller) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot view this order." });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Get order details error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Some error occurred!" });
  }
};

export default {
  createOrder,
  getAllOrdersByUser,
  getOrderDetails,
};
