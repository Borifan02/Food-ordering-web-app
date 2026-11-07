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
  paymentWebhook,
  createGatewaySession,
  getGatewaySessionDetails,
  processMockGatewayPayment,
  verifyGatewaySession
} from "../controllers/payment.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Stripe Routes
router.post("/create-intent", verifyToken, createPaymentIntent);
router.post("/confirm", verifyToken, confirmPayment);

// Ethiopian Local Payment Routes (Direct & Admin)
router.get("/ethiopian/accounts", getEthiopianAccounts);
router.post("/initialize", verifyToken, initializeEthiopianPayment);
router.post("/verify-reference", verifyToken, verifyEthiopianPayment);
router.post("/ethiopian/process", verifyToken, processEthiopianPayment);
router.post("/admin/verify/:orderId", verifyToken, adminVerifyPayment);
router.get("/order/:orderId", verifyToken, getOrderPaymentDetails);
router.post("/webhook", paymentWebhook);

// Payment Gateway Integration Routes (Telebirr / CBE / Chapa)
router.post("/gateway/session", verifyToken, createGatewaySession);
router.get("/gateway/session/:sessionId", getGatewaySessionDetails);
router.post("/gateway/mock-process", processMockGatewayPayment);
router.get("/gateway/verify/:sessionId", verifyGatewaySession);
router.post("/gateway/webhook", paymentWebhook);

export default router;
