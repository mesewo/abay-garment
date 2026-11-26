import Order from "../../models/Order.js";

const SELLER_ALLOWED_STATUSES = [
  "inProcess",
  "inShipping",
  "shipped",
  "delivered",
  "cancelled",
];

// Get all orders for the authenticated seller
export const getAllOrdersOfSeller = async (req, res) => {
  try {
    const orders = await Order.find({ seller: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Seller orders error:", error);
    return res.status(500).json({ success: false, message: "Some error occurred!" });
  }
};

const findOwnedOrder = async (id, sellerId) => {
  const order = await Order.findById(id);
  if (!order) return { error: "not_found" };
  if (String(order.seller) !== String(sellerId)) return { error: "forbidden" };
  return { order };
};

// Get details for a specific order (for this seller)
export const getOrderDetailsForSeller = async (req, res) => {
  try {
    const { order, error } = await findOwnedOrder(req.params.id, req.user.id);
    if (error === "not_found") {
      return res.status(404).json({ success: false, message: "Order not found!" });
    }
    if (error === "forbidden") {
      return res
        .status(403)
        .json({ success: false, message: "This order does not belong to you." });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Seller order details error:", error);
    return res.status(500).json({ success: false, message: "Some error occurred!" });
  }
};

// Update order status (for this seller)
export const updateOrderStatusForSeller = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    if (!SELLER_ALLOWED_STATUSES.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${SELLER_ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const { order, error } = await findOwnedOrder(req.params.id, req.user.id);
    if (error === "not_found") {
      return res.status(404).json({ success: false, message: "Order not found!" });
    }
    if (error === "forbidden") {
      return res
        .status(403)
        .json({ success: false, message: "This order does not belong to you." });
    }

    order.orderStatus = orderStatus;
    order.orderUpdateDate = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully!",
      data: order,
    });
  } catch (error) {
    console.error("Seller order update error:", error);
    return res.status(500).json({ success: false, message: "Some error occurred!" });
  }
};
