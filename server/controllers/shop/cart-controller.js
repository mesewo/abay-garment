import Cart from "../../models/Cart.js";
import StoreProduct from "../../models/StoreProduct.js";

const serializeCart = (cart) => ({
  ...cart._doc,
  items: cart.items.map((item) => ({
    productId: item.productId ? item.productId._id : null,
    image: item.productId ? item.productId.image : null,
    title: item.productId ? item.productId.title : "Product not found",
    price: item.productId ? item.productId.price : null,
    salePrice: item.productId ? item.productId.salePrice : null,
    quantity: item.quantity,
    storeId: item.storeId || (item.productId ? item.productId.store : null),
    sellerId: item.sellerId || (item.productId ? item.productId.seller : null),
  })),
  isBulk: cart.isBulk,
});

// Add to Cart
export const addToCart = async (req, res) => {
  try {
    // The owner is always taken from the verified session cookie.
    const userId = req.user.id;
    const { productId, quantity, isBulk } = req.body;
    let { storeId } = req.body;
    const qty = Number(quantity);

    if (!productId || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    let storeProduct;
    if (storeId) {
      storeProduct = await StoreProduct.findOne({
        product: productId,
        store: storeId,
      });
    } else {
      // Quick-add buttons outside a store page do not know the store. Pick
      // the store with enough stock, and report the best availability if none.
      storeProduct = await StoreProduct.findOne({
        product: productId,
        quantity: { $gte: qty },
      }).sort({ quantity: -1 });

      if (!storeProduct) {
        const fallback = await StoreProduct.findOne({ product: productId }).sort({
          quantity: -1,
        });
        if (!fallback) {
          return res.status(404).json({
            success: false,
            message: "This product is not available in any store yet.",
          });
        }
        return res.status(409).json({
          success: false,
          message: `Only ${fallback.quantity} item(s) available.`,
        });
      }

      storeId = storeProduct.store;
    }

    if (!storeProduct) {
      return res.status(404).json({
        success: false,
        message: "StoreProduct mapping not found for this product in this store",
      });
    }

    const sellerId = storeProduct.seller;
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Product missing store or seller info!",
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    } else if (typeof isBulk !== "undefined") {
      cart.isBulk = Boolean(isBulk);
    }

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === String(productId)
    );

    const nextQuantity =
      index === -1 ? qty : cart.items[index].quantity + qty;

    if (nextQuantity > storeProduct.quantity) {
      return res.status(409).json({
        success: false,
        message: `Only ${storeProduct.quantity} item(s) available in this store.`,
      });
    }

    if (index === -1) {
      cart.items.push({ productId, quantity: qty, storeId, sellerId });
    } else {
      cart.items[index].quantity = nextQuantity;
      cart.items[index].storeId = storeId;
      cart.items[index].sellerId = sellerId;
    }

    await cart.save();
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

// Fetch Cart Items
export const fetchCartItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "image title price salePrice store seller",
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found!" });
    }

    const validItems = cart.items.filter((item) => item.productId);
    if (validItems.length < cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    return res.status(200).json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    console.error("Fetch cart error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

// Update Cart Item Quantity
export const updateCartItemQty = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    const qty = Number(quantity);

    if (!productId || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found!" });
    }

    const index = cart.items.findIndex(
      (item) => item.productId.toString() === String(productId)
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Cart item not present!",
      });
    }

    const storeProduct = await StoreProduct.findOne({
      product: productId,
      store: cart.items[index].storeId,
    });

    if (!storeProduct || qty > storeProduct.quantity) {
      return res.status(409).json({
        success: false,
        message: `Only ${storeProduct?.quantity ?? 0} item(s) available in this store.`,
      });
    }

    cart.items[index].quantity = qty;
    await cart.save();
    await cart.populate({
      path: "items.productId",
      select: "image title price salePrice store seller",
    });

    return res.status(200).json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    console.error("Update cart error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

// Delete Cart Item
export const deleteCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided!",
      });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "image title price salePrice store seller",
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found!" });
    }

    cart.items = cart.items.filter(
      (item) => item.productId && item.productId._id.toString() !== productId
    );

    await cart.save();
    await cart.populate({
      path: "items.productId",
      select: "image title price salePrice store seller",
    });

    return res.status(200).json({ success: true, data: serializeCart(cart) });
  } catch (error) {
    console.error("Delete cart item error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export default {
  addToCart,
  updateCartItemQty,
  deleteCartItem,
  fetchCartItems,
};
