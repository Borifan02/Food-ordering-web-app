import express from "express";
import { 
    createOrder, 
    getUserOrders, 
    getOrderById, 
    updateOrderStatus, 
    getAllOrders, 
    cancelOrder, 
    validateCoupon 
} from "../controllers/order.controller.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createOrder);
router.get("/", verifyToken, getUserOrders);
router.get("/all", verifyAdmin, getAllOrders);
router.post("/validate-coupon", verifyToken, validateCoupon);
router.get("/:id", verifyToken, getOrderById);
router.put("/:id/status", verifyAdmin, updateOrderStatus);
router.post("/:id/cancel", verifyToken, cancelOrder);

export default router;
