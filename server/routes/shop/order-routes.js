import express from "express";
import {
  createOrder,
  getAllOrdersByUser,
  getOrderDetails,
} from "../../controllers/shop/order-controller.js";

const router = express.Router();

router.post("/create", createOrder);
router.get("/user/:userId", getAllOrdersByUser);
router.get("/details/:id", getOrderDetails);

export default router;
