import express from "express";
import inventoryController from "../../controllers/store-keeper/inventory-controller.js";
import { storekeeperAuthMiddleware } from "../../controllers/auth/auth-controller.js";

const router = express.Router();

// Get all products in inventory
router.get("/", storekeeperAuthMiddleware, inventoryController.getInventory);

// Update stock for a product
router.put("/:productId",  storekeeperAuthMiddleware,  inventoryController.updateStock);

export default router;