import Order from "../../models/Order.js";
import ProductRequest from "../../models/ProductRequest.js";

// Paid orders are the source of truth for the accountant's ledger.
export const getAllTransactions = async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: "paid" })
      .populate("userId", "userName email")
      .populate("seller", "userName email")
      .populate("store", "name")
      .sort({ paymentPaidAt: -1, createdAt: -1 });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Accountant transactions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};

// Stock requests that are still waiting for a storekeeper decision.
export const getAllRequests = async (req, res) => {
  try {
    const requests = await ProductRequest.find({ status: "pending" })
      .populate("product", "title image price")
      .populate("requestedBy", "userName email")
      .populate("seller", "userName email")
      .populate("store", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Accountant requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
    });
  }
};

export const getAccountantStats = async (req, res) => {
  try {
    const [totalTransactions, pendingRequests, pendingPayments, revenue] =
      await Promise.all([
        Order.countDocuments({ paymentStatus: "paid" }),
        ProductRequest.countDocuments({ status: "pending" }),
        Order.countDocuments({ paymentStatus: "pending" }),
        Order.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalTransactions,
        totalRequests: pendingRequests,
        pendingPayments,
        totalRevenue: revenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Accountant stats error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch stats" });
  }
};

export default {
  getAllTransactions,
  getAllRequests,
  getAccountantStats,
};
