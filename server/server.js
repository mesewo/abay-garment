import "./config/env.js";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { requireAuth, requireRole } from "./middleware/auth.js";

import authRouter from "./routes/auth/auth-routes.js";
import adminProductsRouter from "./routes/admin/products-routes.js";
import adminOrderRouter from "./routes/admin/orders-routes.js";
import adminDashboardRoutes from "./routes/admin/dashboard-routes.js";
import adminUsersRouter from "./routes/admin/users-routes.js";
import adminReportsRouter from "./routes/admin/reports-routes.js";
import adminFeedbackRouter from "./routes/admin/feedback-routes.js";
import adminSettingsRouter from "./routes/admin/settings-routes.js";
import adminFeaturesRouter from "./routes/admin/features-routes.js";
import accountantRoutes from "./routes/admin/accountant-routes.js";

import shopProductsRouter from "./routes/shop/products-routes.js";
import shopCartRouter from "./routes/shop/cart-routes.js";
import shopAddressRouter from "./routes/shop/address-routes.js";
import shopOrderRouter from "./routes/shop/order-routes.js";
import shopSearchRouter from "./routes/shop/search-routes.js";
import bulkCartRoutes from "./routes/shop/bulk-cart-routes.js";
import shopFeedbackRouter from "./routes/shop/feedback-routes.js";
import shopStoreRouter from "./routes/shop/store-routes.js";
import shopUserRouter from "./routes/shop/user-routes.js";

import factmanDashboardRouter from "./routes/factman/dashboard-routes.js";
import factmanProductsRouter from "./routes/factman/products-routes.js";
import factmanOrdersRouter from "./routes/factman/orders-routes.js";
import factmanUsersRouter from "./routes/factman/users-routes.js";
import factmanReportsRouter from "./routes/factman/reports-routes.js";
import factmanFeedbackRouter from "./routes/factman/feedback-routes.js";
import factmanSettingsRouter from "./routes/factman/settings-routes.js";
import factmanFeaturesRouter from "./routes/factman/features-routes.js";

import sellerProductsRouter from "./routes/seller/products-routes.js";
import sellerOrdersRouter from "./routes/seller/orders-routes.js";
import sellerDashboardRouter from "./routes/seller/dashboard-routes.js";
import sellerReportRoutes from "./routes/seller/reports-routes.js";
import sellerStoreRoutes from "./routes/seller/store-routes.js";
import sellerRequestsRoutes from "./routes/seller/requests-routes.js";
import sellerSettingRoutes from "./routes/seller/settings-routes.js";

import storeKeeperStoreRoutes from "./routes/store-keeper/store-routes.js";
import storeKeeeperUserRoutes from "./routes/store-keeper/user-routes.js";
import storekeeperDashboardRoutes from "./routes/store-keeper/dashboard-routes.js";
import storeKeeperInventoryRoutes from "./routes/store-keeper/inventory-routes.js";
import storeKeeperReportRoutes from "./routes/store-keeper/report-routes.js";
import storeKeeperSettingsRoutes from "./routes/store-keeper/settings-routes.js";

import commonFeatureRouter from "./routes/common/feature-routes.js";
import productRequestRoutes from "./routes/productRequest-routes.js";
import notificationsRouter from "./routes/notifications.js";

import paymentroute from "./routes/payment/payment.js";
import verifyQRRoutes from "./routes/payment/verifyQr.js";
import paymentVerify from "./routes/payment/paymentVerify.js";
import { webhookRouter } from "./routes/payment/paymentVerify.js";
import { cancelExpiredChapaOrders } from "./helpers/order-stock.js";

import { notifyAllLowOrOutOfStockProducts } from "./controllers/productRequest-controller.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

const allowedOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests and configured browser origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET",
  message: { success: false, message: "Too many attempts. Please try again later." },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many payment attempts. Please try again later." },
});

app.use("/api/payment/webhook", express.raw({ type: "application/json", limit: "1mb" }), webhookRouter);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) =>
  res.json({ success: true, status: "ok", uptime: process.uptime() })
);

// Public
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/shop/products", shopProductsRouter);
app.use("/api/shop/search", shopSearchRouter);
app.use("/api/shop/stores", shopStoreRouter);
app.use("/api/shop/feedback", shopFeedbackRouter);
app.use("/api/common/feature", commonFeatureRouter);

// Authenticated shoppers
app.use("/api/shop/cart", requireAuth, shopCartRouter);
app.use("/api/shop/bulk-cart", requireAuth, bulkCartRoutes);
app.use("/api/shop/address", requireAuth, shopAddressRouter);
app.use("/api/shop/order", requireAuth, shopOrderRouter);
app.use("/api/shop/users", requireAuth, shopUserRouter);

// Admin (mounted before the generic /api/admin guard so accountants can use
// their own namespace without being blocked here).
app.use("/api/admin/accountant", requireRole("admin"), accountantRoutes);
app.use("/api/admin", requireRole("admin"), adminDashboardRoutes);
app.use("/api/admin/products", requireRole("admin"), adminProductsRouter);
app.use("/api/admin/orders", requireRole("admin"), adminOrderRouter);
app.use("/api/admin/users", requireRole("admin"), adminUsersRouter);
app.use("/api/admin/reports", requireRole("admin"), adminReportsRouter);
app.use("/api/admin/feedback", requireRole("admin"), adminFeedbackRouter);
app.use("/api/admin/settings", requireRole("admin"), adminSettingsRouter);
app.use("/api/admin/features", requireRole("admin"), adminFeaturesRouter);

// Accountant
app.use("/api/accountant", requireRole("accountant", "admin"), accountantRoutes);

// Factory manager
app.use("/api/factman/products", requireRole("factman"), factmanProductsRouter);
app.use("/api/factman/orders", requireRole("factman"), factmanOrdersRouter);
app.use("/api/factman/users", requireRole("factman"), factmanUsersRouter);
app.use("/api/factman/reports", requireRole("factman"), factmanReportsRouter);
app.use("/api/factman/feedback", requireRole("factman"), factmanFeedbackRouter);
app.use("/api/factman/settings", requireRole("factman"), factmanSettingsRouter);
app.use("/api/factman/features", requireRole("factman"), factmanFeaturesRouter);
app.use("/api/factman", requireRole("factman"), factmanDashboardRouter);

// Seller
app.use("/api/seller/products", requireRole("seller"), sellerProductsRouter);
app.use("/api/seller/stores", requireRole("seller"), sellerStoreRoutes);
app.use("/api/seller/reports", requireRole("seller"), sellerReportRoutes);
app.use("/api/seller/orders", requireRole("seller"), sellerOrdersRouter);
app.use("/api/seller/settings", requireRole("seller"), sellerSettingRoutes);
app.use("/api/seller", requireRole("seller"), sellerDashboardRouter);
app.use("/api/seller", requireRole("seller"), sellerRequestsRoutes);

// Store keeper
app.use("/api/storekeeper/stores", requireRole("store_keeper"), storeKeeperStoreRoutes);
app.use("/api/storekeeper/users", requireRole("store_keeper"), storeKeeeperUserRoutes);
app.use("/api/storekeeper/inventory", requireRole("store_keeper"), storeKeeperInventoryRoutes);
app.use("/api/storekeeper/reports", requireRole("store_keeper"), storeKeeperReportRoutes);
app.use("/api/storekeeper/settings", requireRole("store_keeper"), storeKeeperSettingsRoutes);
app.use("/api/storekeeper", requireRole("store_keeper"), storekeeperDashboardRoutes);

// Shared, self-guarded routes
app.use("/api/product-requests", productRequestRoutes);
app.use("/api/notifications", requireAuth, notificationsRouter);

// Payments
app.use("/api/payment/verify-qr", verifyQRRoutes);
app.use("/api/payment", paymentLimiter, paymentroute);
app.use("/api/payment", paymentLimiter, paymentVerify);

// Unknown API route
app.use("/api", (req, res) =>
  res.status(404).json({ success: false, message: "Endpoint not found" })
);

// Central error handler
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Unhandled error:", error);
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message || "Internal server error",
  });
});

const start = async () => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set. Refusing to start.");
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Refusing to start.");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production" && !process.env.API_PUBLIC_URL) {
    console.error("API_PUBLIC_URL is required in production. Refusing to start.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }

  try {
    await notifyAllLowOrOutOfStockProducts();
  } catch (error) {
    console.warn("Low-stock notification check skipped:", error.message);
  }

  const stockSweep = async () => {
    try {
      await cancelExpiredChapaOrders();
    } catch (error) {
      console.error("Expired order stock sweep error:", error.message);
    }
  };
  await stockSweep();
  setInterval(stockSweep, 5 * 60 * 1000);

  app.listen(PORT, () => console.log(`Server is now running on port ${PORT}`));
};

start();

export default app;
