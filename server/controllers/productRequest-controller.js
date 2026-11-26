import crypto from "crypto";
import Product from "../models/Product.js";
import StoreProduct from "../models/StoreProduct.js";
import ProductRequest from "../models/ProductRequest.js";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import BulkCart from "../models/BulkCart.js";

// Helper: Notify Factman if product is low or out of stock
async function notifyFactmanIfLowOrOutOfStock(product) {
  if (!product) return;

  // Prevent duplicate notifications for the same product
  const existing = await Notification.findOne({
    product: product._id,
    type: "low_stock",
    forRole: "factman",
    seen: false,
  });

  if (!existing && product.totalStock <= (product.lowStockThreshold ?? 5)) {
    await Notification.create({
      type: "low_stock",
      message:
        product.totalStock === 0
          ? `${product.title} is OUT OF STOCK in factory!`
          : `${product.title} is LOW in factory stock (${product.totalStock})`,
      product: product._id, // Always use Product's _id
      forRole: "factman",
      seen: false,
      createdAt: new Date(),
    });
    // console.log("Notification created for Factman!", product.title, product.totalStock);
  }
}

// Seller or buyer makes a stock/product request
export const requestProduct = async (req, res) => {
  const { productId, storeId, isBulk, addressInfo } = req.body;
  const quantity = Number(req.body.quantity);
  const sellerId = req.user.id;
  const requestedBy = req.user.id;

  try {
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "A product and a positive quantity are required." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (Boolean(isBulk) && (!addressInfo?.address || !addressInfo?.phone)) {
      return res.status(400).json({
        success: false,
        message: "A delivery address and phone number are required for bulk requests.",
      });
    }

    let requestData = {
      product: productId,
      quantity,
      isBulk: Boolean(isBulk),
      requestedBy,
    };

    if (req.user.role === "seller") {
      if (!storeId) {
        return res
          .status(400)
          .json({ success: false, message: "Store ID is required for sellers." });
      }
      requestData.store = storeId;
      requestData.seller = req.user.id;
    }

    const existingQuery = {
      product: productId,
      requestedBy,
      status: "pending",
      isBulk: Boolean(isBulk),
    };
    if (req.user.role === "seller") {
      existingQuery.store = storeId;
      existingQuery.seller = req.user.id;
    }

    const existingRequest = await ProductRequest.findOne(existingQuery);

    if (existingRequest) {
      return res
        .status(409)
        .json({ success: false, message: "You already have a pending request." });
    }

    const request = await ProductRequest.create({
      ...requestData,
      ...(addressInfo
        ? {
            deliveryAddress: {
              address: addressInfo.address,
              city: addressInfo.city,
              pincode: addressInfo.pincode,
              phone: addressInfo.phone,
              notes: addressInfo.notes,
            },
          }
        : {}),
    });

    if (isBulk) {
      const bulkCart = await BulkCart.findOne({ userId: requestedBy });
      if (bulkCart) {
        bulkCart.items = [];
        await bulkCart.save();
      }
    }

    return res.status(201).json({ success: true, request });
  } catch (err) {
    console.error("Request product error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Approve product request
export const approveProductRequest = async (req, res) => {
  const { requestId } = req.params;
  const storekeeperId = req.user.id;

  try {
    const request = await ProductRequest.findById(requestId).populate("product");
    if (!request || request.status !== "pending" || !request.product) {
      return res.status(404).json({ success: false, message: "Request not found or already handled" });
    }

    // Move stock out of the factory atomically so two approvals cannot
    // oversell the same units.
    const product = await Product.findOneAndUpdate(
      { _id: request.product._id, totalStock: { $gte: request.quantity } },
      { $inc: { totalStock: -request.quantity } },
      { new: true }
    );
    if (!product) {
      return res.status(400).json({ success: false, message: "Not enough factory stock" });
    }

    // Notify Factman if low or out of stock
    await notifyFactmanIfLowOrOutOfStock(product);

    // Add the units to the store that requested them.
    if (request.store) {
      await StoreProduct.findOneAndUpdate(
        { product: request.product._id, store: request.store },
        {
          $inc: { quantity: request.quantity },
          $set: { seller: request.seller },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    request.status = "approved";
    request.reviewedAt = new Date();
    request.reviewedBy = storekeeperId;
    await request.save();

    // Only buyer bulk requests become orders. Seller replenishment requests
    // just move stock from the factory to the store.
    if (request.isBulk && request.deliveryAddress?.address) {
      const unitPrice =
        request.product.salePrice > 0
          ? request.product.salePrice
          : request.product.price;

      await Order.create({
        userId: request.requestedBy,
        orderItems: [
          {
            productId: request.product._id,
            title: request.product.title,
            image: request.product.image,
            price: unitPrice,
            quantity: request.quantity,
          },
        ],
        totalAmount: unitPrice * request.quantity,
        addressInfo: request.deliveryAddress,
        paymentMethod: "chapa",
        paymentStatus: "pending",
        orderStatus: "pending",
        orderDate: new Date(),
        orderUpdateDate: new Date(),
        tx_ref: `order_${crypto.randomUUID()}`,
        type: "bulk",
      });
    }

    return res.json({ success: true, message: "Product request approved", request });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Reject product request
export const rejectProductRequest = async (req, res) => {
  const { requestId } = req.params;
  const storekeeperId = req.user.id;

  try {
    const request = await ProductRequest.findById(requestId);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ success: false, message: "Request not found or already handled" });
    }

    request.status = "rejected";
    request.reviewedAt = new Date();
    request.reviewedBy = storekeeperId;
    await request.save();

    res.json({ success: true, message: "Product request rejected", request });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all requests
export const getAllRequests = async (req, res) => {
  try {
    const requests = await ProductRequest.find()
      .populate("product")
      .populate("seller")
      .populate("store")
      .populate("requestedBy")
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get my requests
export const getMyRequests = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const requests = await ProductRequest.find({ seller: sellerId })
      .populate("product")
      .populate("store");
    res.json({ success: true, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Trend of seller product requests (grouped by day)
export const getProductRequestTrend = async (req, res) => {
  try {
    const { start, end } = req.query;
    const match = { status: "approved" }; // Only approved requests
    if (start && end) {
      match.requestedAt = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }
    const trend = await ProductRequest.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$requestedAt" } },
          totalRequests: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(trend);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Notify for all low/out-of-stock products (call on server start)
export async function notifyAllLowOrOutOfStockProducts() {
  const products = await Product.find();
  for (const product of products) {
    const existing = await Notification.findOne({
      product: product._id,
      type: "low_stock",
      forRole: "factman",
      seen: false,
    });
    if (!existing && product.totalStock <= (product.lowStockThreshold ?? 5)) {
      await Notification.create({
        type: "low_stock",
        message:
          product.totalStock === 0
            ? `${product.title} is OUT OF STOCK in factory!`
            : `${product.title} is LOW in factory stock (${product.totalStock})`,
        product: product._id,
        forRole: "factman",
        seen: false,
        createdAt: new Date(),
      });
      // console.log("Notification created for Factman!", product.title, product.totalStock);
    }
  }
}

export const markRequestDelivered = async (req, res) => {
  const { requestId } = req.params;
  try {
    const request = await ProductRequest.findById(requestId);
    if (!request || request.status !== "approved") {
      return res.status(400).json({ success: false, message: "Only approved requests can be delivered." });
    }
    request.status = "delivered";
    await request.save();

    // Also update the related Order (if exists)
    const order = await Order.findOne({
      userId: request.requestedBy,
      "orderItems.productId": request.product,
      type: "bulk",
      orderStatus: { $in: ["pending", "approved", "inProcess", "inShipping"] },
    }).sort({ createdAt: -1 });
    if (order) {
      order.orderStatus = "delivered";
      order.orderUpdateDate = new Date();
      await order.save();
    }

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};