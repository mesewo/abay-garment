import express from "express";
import {
  createStore,
  getStores,
  getStoreById,
  updateStore,
  updateStoreSellers,
  deleteStore,
} from "../../controllers/store-keeper/store-controller.js";
import { storekeeperAuthMiddleware } from "../../controllers/auth/auth-controller.js";

const router = express.Router();

router.post("/", storekeeperAuthMiddleware, createStore);
router.get("/", storekeeperAuthMiddleware, getStores);
router.get("/:id", storekeeperAuthMiddleware, getStoreById);
router.put("/:storeId/sellers", storekeeperAuthMiddleware, updateStoreSellers);
router.put("/:id", storekeeperAuthMiddleware, updateStore);
router.delete("/:id", storekeeperAuthMiddleware, deleteStore);

export default router;
