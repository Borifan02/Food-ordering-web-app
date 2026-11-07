import express from "express";
import { 
  createPaymentIntent, 
  confirmPayment, 
  getEthiopianAccounts, 
  processEthiopianPayment 
} from "../controllers/payment.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-intent", verifyToken, createPaymentIntent);
router.post("/confirm", verifyToken, confirmPayment);
router.get("/ethiopian/accounts", getEthiopianAccounts);
router.post("/ethiopian/process", verifyToken, processEthiopianPayment);

export default router;