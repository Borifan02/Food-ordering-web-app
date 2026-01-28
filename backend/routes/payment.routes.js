import express from "express";
import { createPaymentIntent, confirmPayment } from "../controllers/payment.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-intent", verifyToken, createPaymentIntent);
router.post("/confirm", verifyToken, confirmPayment);

export default router;