import BulkCart from "../../models/BulkCart.js";
import Product from "../../models/Product.js";

const serialize = (cart) => ({
  ...cart._doc,
  items: cart.items
    .filter((item) => item.productId)
    .map((item) => ({
      productId: item.productId._id,
      image: item.productId.image,
      title: item.productId.title,
      price: item.productId.price,
      salePrice: item.productId.salePrice,
      quantity: item.quantity,
      sellerId: item.sellerId || item.productId.seller,
    })),
  isBulk: true,
});

export const addToBulkCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    const quantity = Number(req.body.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid data provided!" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let cart = await BulkCart.findOne({ userId });
    if (!cart) cart = new BulkCart({ userId, items: [], isBulk: true });
    cart.isBulk = true;

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === String(productId)
    );

    if (index === -1) {
      cart.items.push({ productId, quantity, sellerId: product.seller || null });
    } else {
      cart.items[index].quantity += quantity;
      cart.items[index].sellerId = product.seller || null;
    }

    await cart.save();
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error("Add to bulk cart error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export const fetchBulkCartItems = async (req, res) => {
  try {
    const cart = await BulkCart.findOne({ userId: req.user.id }).populate({
      path: "items.productId",
      select: "image title price salePrice seller",
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Bulk cart not found!" });
    }

    const validItems = cart.items.filter((item) => item.productId);
    if (validItems.length < cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    return res.status(200).json({ success: true, data: serialize(cart) });
  } catch (error) {
    console.error("Fetch bulk cart error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export const updateBulkCartItemQty = async (req, res) => {
  try {
    const { productId } = req.body;
    const quantity = Number(req.body.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Invalid data provided!" });
    }

    const cart = await BulkCart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Bulk cart not found!" });
    }

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === String(productId)
    );
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Bulk cart item not present!" });
    }

    cart.items[index].quantity = quantity;
    await cart.save();
    await cart.populate({
      path: "items.productId",
      select: "image title price salePrice seller",
    });

    return res.status(200).json({ success: true, data: serialize(cart) });
  } catch (error) {
    console.error("Update bulk cart error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export const deleteBulkCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ success: false, message: "Invalid data provided!" });
    }

    const cart = await BulkCart.findOne({ userId: req.user.id }).populate({
      path: "items.productId",
      select: "image title price salePrice seller",
    });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Bulk cart not found!" });
    }

    cart.items = cart.items.filter(
      (item) => item.productId && item.productId._id.toString() !== productId
    );
    await cart.save();
    await cart.populate({
      path: "items.productId",
      select: "image title price salePrice seller",
    });

    return res.status(200).json({ success: true, data: serialize(cart) });
  } catch (error) {
    console.error("Delete bulk cart error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export default {
  addToBulkCart,
  updateBulkCartItemQty,
  deleteBulkCartItem,
  fetchBulkCartItems,
};
