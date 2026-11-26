import Product from "../../models/Product.js";
import InventoryLog from "../../models/InventoryLog.js";

export const updateStock = async (req, res) => {
  try {
    // The route declares :productId, so read it from params (with a body
    // fallback for backwards compatibility).
    const productId = req.params.productId || req.body.productId;
    const { notes } = req.body;
    const quantity = Number(req.body.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "A product id and a non-negative quantity are required.",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const previousStock = product.totalStock;
    product.totalStock = quantity;
    await product.save();

    await InventoryLog.create({
      product: productId,
      changeType: "adjustment",
      quantity: quantity - previousStock,
      previousStock,
      newStock: quantity,
      performedBy: req.user.id,
      notes,
    });

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("Update stock error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getInventory = async (req, res) => {
  try {
    const products = await Product.find();
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Get inventory error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getStoreInventory = async (req, res) => {
  try {
    const { filter } = req.query;
    const query = {};
    if (filter === "low-stock") {
      query.totalStock = { $lte: 5 };
    }
    const products = await Product.find(query);
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Get store inventory error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default {
  updateStock,
  getInventory,
  getStoreInventory,
};
