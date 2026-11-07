import express from "express";
import { 
  createPaymentIntent, 
  confirmPayment, 
  getEthiopianAccounts, 
  initializeEthiopianPayment,
  verifyEthiopianPayment,
  processEthiopianPayment,
  adminVerifyPayment,
  getOrderPaymentDetails,
  paymentWebhook
} from "../controllers/payment.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Stripe Routes
router.post("/create-intent", verifyToken, createPaymentIntent);
router.post("/confirm", verifyToken, confirmPayment);

// Ethiopian Local Payment Routes
router.get("/ethiopian/accounts", getEthiopianAccounts);
router.post("/initialize", verifyToken, initializeEthiopianPayment);
router.post("/verify-reference", verifyToken, verifyEthiopianPayment);
router.post("/ethiopian/process", verifyToken, processEthiopianPayment);
router.post("/admin/verify/:orderId", verifyToken, adminVerifyPayment);
router.get("/order/:orderId", verifyToken, getOrderPaymentDetails);
router.post("/webhook", paymentWebhook);

export default router;
