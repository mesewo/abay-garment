import Feedback from "../../models/Feedback.js";
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";

export const submitFeedback = async (req, res) => {
  try {
    const { orderId, productId, rating, comment, type } = req.body;
    const userId = req.user.id;
    const userName = req.user.userName;

    if (!orderId || !productId) {
      return res
        .status(400)
        .json({ success: false, message: "Order and product are required." });
    }
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Rating must be between 1 and 5." });
    }

    // The buyer must own a delivered/confirmed order containing this product.
    const order = await Order.findOne({
      _id: orderId,
      userId,
      "orderItems.productId": productId,
      orderStatus: { $in: ["delivered", "approved", "confirmed"] },
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: "You need to purchase and receive this product to leave feedback.",
      });
    }

    const existingFeedback = await Feedback.findOne({
      product: productId,
      user: userId,
    });
    if (existingFeedback) {
      return res.status(409).json({
        success: false,
        message: "You already left feedback for this product!",
      });
    }

    const feedback = await Feedback.create({
      user: userId,
      product: productId,
      order: orderId,
      userName,
      rating: numericRating,
      comment,
      type: type || "product",
    });

    const approved = await Feedback.find({ product: productId, status: "approved" });
    const averageReview =
      approved.length > 0
        ? approved.reduce((sum, item) => sum + item.rating, 0) / approved.length
        : 0;
    await Product.findByIdAndUpdate(productId, { averageReview });

    return res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    console.error("Submit feedback error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user.id }).populate(
      "product",
      "title image"
    );
    return res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    console.error("Get my feedback error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getProductFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({
      product: req.params.productId,
      status: "approved",
    });
    return res.status(200).json({ success: true, data: feedbacks });
  } catch (error) {
    console.error("Get product feedback error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const { storeId } = req.query;
    const filter = { status: "approved" };

    if (storeId) {
      const products = await Product.find({ storeId }).select("_id");
      filter.product = { $in: products.map((product) => product._id) };
    }

    const feedbacks = await Feedback.find(filter).lean();
    return res.status(200).json({ success: true, data: feedbacks });
  } catch (error) {
    console.error("Get all feedback error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default {
  submitFeedback,
  getMyFeedback,
  getProductFeedback,
  getAllFeedback,
};
