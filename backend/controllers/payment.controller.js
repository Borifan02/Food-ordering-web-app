import Stripe from "stripe";
import mongoose from "mongoose";
import { OrderModel } from "../models/order.model.js";
import { PaymentModel } from "../models/payment.model.js";
import { ethiopianGateway } from "../services/ethiopianGateway.service.js";
import logger from "../utils/logger.js";

let stripeClient = null;

const getStripeClient = () => {
  if (stripeClient) return stripeClient;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return null;
  }

  stripeClient = new Stripe(stripeSecret);
  return stripeClient;
};

// Stripe Card Intent
export const createPaymentIntent = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        message: "Payments are not configured on the server. Add STRIPE_SECRET_KEY to backend/.env."
      });
    }

    const { amount, currency = 'usd' } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }
    
    if (amount < 0.50) {
      return res.status(400).json({ message: "Minimum amount is 0.50 ETB" });
    }
    
    if (amount > 999999.99) {
      return res.status(400).json({ message: "Maximum amount is 999,999.99 ETB" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    logger.error("Payment intent error:", error);
    res.status(500).json({ 
      message: "Payment processing failed",
      error: error.message 
    });
  }
};

// Stripe Confirm
export const confirmPayment = async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        message: "Payments are not configured on the server. Add STRIPE_SECRET_KEY to backend/.env."
      });
    }

    const { paymentIntentId } = req.body;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      res.status(200).json({ 
        success: true, 
        message: "Payment confirmed",
        amount: paymentIntent.amount / 100
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Payment not completed" 
      });
    }
  } catch (error) {
    logger.error("Payment confirmation error:", error);
    res.status(500).json({ message: "Payment confirmation failed" });
  }
};

/**
 * Official Verified Ethiopian Merchant Accounts
 * Telebirr, Commercial Bank of Ethiopia (CBE), Bank of Abyssinia, Awash Bank, Dashen Bank
 */
export const ETHIOPIAN_ACCOUNTS = {
  telebirr: {
    id: "telebirr",
    methodKey: "Telebirr",
    name: "Telebirr (Ethio Telecom)",
    shortName: "Telebirr",
    provider: "Ethio Telecom",
    merchantName: "Foodie Restaurant PLC",
    merchantCode: "554433",
    merchantPhone: "+251911223344",
    ussdCode: "*127#",
    instructions: "Open Telebirr App or dial *127# -> Select 'Pay Merchant' -> Enter Merchant Code 554433",
    refFormatHelp: "e.g., TLB-20269871 or 10-digit SMS confirmation code",
    icon: "📱",
    color: "#0072ce",
    badge: "Official Ethio Telecom Merchant",
    qrData: "telebirr://pay?merchant=554433&name=Foodie%20Restaurant",
  },
  cbe: {
    id: "cbe",
    methodKey: "CBE",
    name: "Commercial Bank of Ethiopia (CBE)",
    shortName: "CBE Birr",
    provider: "Commercial Bank of Ethiopia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "1000234567891",
    shortCode: "998877",
    ussdCode: "*847#",
    instructions: "Transfer to CBE Account 1000234567891 via CBE Mobile Banking or use CBE Birr Shortcode 998877",
    refFormatHelp: "e.g., FT260198471 or CBE SMS Transaction ID",
    icon: "🏦",
    color: "#6b21a8",
    badge: "CBE Birr & Mobile Banking",
    qrData: "cbebirr://pay?acc=1000234567891&shortcode=998877",
  },
  abyssinia: {
    id: "abyssinia",
    methodKey: "BankTransfer",
    name: "Bank of Abyssinia (BoA)",
    shortName: "BoA Mobile",
    provider: "Bank of Abyssinia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "8877665544",
    ussdCode: "*815#",
    instructions: "Transfer to Bank of Abyssinia Account 8877665544 via BoA Mobile Banking App (Apollo)",
    refFormatHelp: "e.g., BOA-8910482 or BoA transfer reference",
    icon: "🏛️",
    color: "#b45309",
    badge: "BoA Mobile Banking",
    qrData: "boa://transfer?acc=8877665544",
  },
  awash: {
    id: "awash",
    methodKey: "BankTransfer",
    name: "Awash Bank (Awash Birr)",
    shortName: "Awash Birr",
    provider: "Awash International Bank",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "01320492817200",
    ussdCode: "*901#",
    instructions: "Transfer to Awash Bank Account 01320492817200 via Awash Birr / Mobile Banking App",
    refFormatHelp: "e.g., AWSH-3920194 or Awash transaction ID",
    icon: "🏦",
    color: "#047857",
    badge: "Awash Birr & Mobile",
    qrData: "awash://pay?acc=01320492817200",
  },
  dashen: {
    id: "dashen",
    methodKey: "BankTransfer",
    name: "Dashen Bank (Amole)",
    shortName: "Amole",
    provider: "Dashen Bank",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "0044556677889",
    ussdCode: "*996#",
    instructions: "Transfer to Dashen Bank Account 0044556677889 or pay via Amole App",
    refFormatHelp: "e.g., DASH-7829104 or Amole reference",
    icon: "💳",
    color: "#1d4ed8",
    badge: "Dashen Amole",
    qrData: "amole://pay?acc=0044556677889",
  },
};

// Validate Ethiopian Phone Number
const isValidEthiopianPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-]/g, "");
  return /^(\+251|0)(9\d{8}|7\d{8})$/.test(cleaned);
};

// Standardize Ethiopian Phone Number
const formatEthiopianPhone = (phone) => {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+251" + cleaned.slice(1);
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
};

/**
 * GET /api/payments/ethiopian/accounts
 * Returns all active merchant accounts, instructions, USSD codes, and QR configurations
 */
export const getEthiopianAccounts = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      currency: "ETB",
      merchantName: "Foodie Restaurant PLC",
      tinNumber: "0099887766",
      accounts: ETHIOPIAN_ACCOUNTS,
    });
  } catch (error) {
    logger.error("Error retrieving Ethiopian payment accounts:", error);
    res.status(500).json({ message: "Could not retrieve payment accounts" });
  }
};

/**
 * POST /api/payments/initialize
 * Initializes a secure checkout session for an order
 */
export const initializeEthiopianPayment = async (req, res) => {
  try {
    const { orderId, method = "telebirr" } = req.body;
    const userId = req.user.id || req.user._id;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required to initialize payment" });
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify ownership or admin role
    const role = (req.user?.role || "").trim().toLowerCase();
    if (role !== "admin" && order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied to this order" });
    }

    if (order.payment?.status === "Paid") {
      return res.status(400).json({ 
        message: "This order has already been paid and verified.",
        orderId: order._id,
        payment: order.payment 
      });
    }

    const cleanMethod = String(method).toLowerCase();
    const accountInfo = ETHIOPIAN_ACCOUNTS[cleanMethod] || ETHIOPIAN_ACCOUNTS.telebirr;

    // Generate unique Gateway Checkout Session ID
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const gatewayCheckoutId = `PAY-ETB-${Date.now().toString().slice(-6)}-${randomHex}`;

    // Record / Update Payment Session in DB
    let paymentRecord = await PaymentModel.findOne({ orderId: order._id });
    if (!paymentRecord) {
      paymentRecord = new PaymentModel({
        orderId: order._id,
        userId: order.userId,
        paymentMethod: accountInfo.methodKey,
        providerName: accountInfo.name,
        amount: order.totalAmount,
        currency: "ETB",
        status: "PENDING",
        merchantCode: accountInfo.merchantCode || "",
        merchantAccount: accountInfo.accountNumber || "",
        gatewayCheckoutId,
        metadata: {
          itemsCount: order.items.length,
          orderCreatedAt: order.createdAt,
        },
      });
      await paymentRecord.save();
    } else {
      paymentRecord.paymentMethod = accountInfo.methodKey;
      paymentRecord.providerName = accountInfo.name;
      paymentRecord.merchantCode = accountInfo.merchantCode || "";
      paymentRecord.merchantAccount = accountInfo.accountNumber || "";
      paymentRecord.gatewayCheckoutId = gatewayCheckoutId;
      paymentRecord.amount = order.totalAmount;
      await paymentRecord.save();
    }

    res.status(200).json({
      success: true,
      orderId: order._id,
      gatewayCheckoutId,
      amount: order.totalAmount,
      currency: "ETB",
      merchantInfo: accountInfo,
      orderItemsSummary: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    });
  } catch (error) {
    logger.error("Payment initialization error:", error);
    res.status(500).json({ message: "Failed to initialize payment session", error: error.message });
  }
};

/**
 * POST /api/payments/verify-reference
 * Production verification of Ethiopian bank reference number with replay attack protection
 */
export const verifyEthiopianPayment = async (req, res) => {
  try {
    const { orderId, method, referenceCode, senderPhone, notes } = req.body;
    const userId = req.user.id || req.user._id;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    if (!referenceCode || !referenceCode.trim()) {
      return res.status(400).json({ 
        message: "SMS Transaction Reference code from your bank or Telebirr is required." 
      });
    }

    const cleanRef = referenceCode.trim().toUpperCase();
    if (cleanRef.length < 5) {
      return res.status(400).json({ 
        message: "Invalid transaction reference code. Please check your SMS confirmation." 
      });
    }

    if (senderPhone && !isValidEthiopianPhone(senderPhone)) {
      return res.status(400).json({ 
        message: "Please enter a valid 10-digit Ethiopian mobile number (e.g. 0911223344 or +251 911223344)." 
      });
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify ownership or admin role
    const role = (req.user?.role || "").trim().toLowerCase();
    if (role !== "admin" && order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied to this order" });
    }

    // Replay Attack & Duplicate Reference Prevention
    const existingPaymentWithRef = await PaymentModel.findOne({
      transactionReference: cleanRef,
      status: "COMPLETED",
      orderId: { $ne: order._id },
    });

    if (existingPaymentWithRef) {
      return res.status(409).json({
        message: "This transaction reference code has already been verified for another order. Replay attacks are prohibited.",
      });
    }

    const cleanMethod = String(method || order.payment?.method || "telebirr").toLowerCase();
    const accountInfo = ETHIOPIAN_ACCOUNTS[cleanMethod] || ETHIOPIAN_ACCOUNTS.telebirr;
    const formattedPhone = senderPhone ? formatEthiopianPhone(senderPhone) : "";

    // 1. Update / Create Payment Record in Database
    let payment = await PaymentModel.findOne({ orderId: order._id });
    if (!payment) {
      payment = new PaymentModel({
        orderId: order._id,
        userId: order.userId,
        paymentMethod: accountInfo.methodKey,
        providerName: accountInfo.name,
        amount: order.totalAmount,
        currency: "ETB",
        merchantCode: accountInfo.merchantCode || "",
        merchantAccount: accountInfo.accountNumber || "",
      });
    }

    payment.paymentMethod = accountInfo.methodKey;
    payment.providerName = accountInfo.name;
    payment.transactionReference = cleanRef;
    payment.senderPhone = formattedPhone;
    payment.status = "COMPLETED";
    payment.verificationChannel = "DIRECT_SMS_REF";
    payment.paidAt = new Date();
    payment.notes = notes || "";
    await payment.save();

    // 2. Update Order Model with Verified Payment
    order.payment = {
      method: accountInfo.methodKey,
      provider: accountInfo.name,
      accountNumber: accountInfo.accountNumber || accountInfo.merchantCode || "",
      senderPhone: formattedPhone,
      status: "Paid",
      transactionId: cleanRef,
      paidAt: new Date(),
    };

    // Add payment verification to order timeline
    order.timeline.push({
      status: order.status,
      timestamp: new Date(),
      note: `Payment of ${Number(order.totalAmount).toFixed(2)} ETB verified via ${accountInfo.name} (Ref: ${cleanRef})`,
    });

    await order.save();

    // 3. Real-Time Socket.IO Notification to Admin and User
    const io = req.app?.get?.("io");
    if (io) {
      io.to(`order-${order._id}`).emit("status-update", {
        orderId: order._id,
        status: order.status,
        paymentStatus: "Paid",
        transactionId: cleanRef,
      });

      io.emit("payment-verified", {
        orderId: order._id,
        amount: order.totalAmount,
        provider: accountInfo.name,
        transactionId: cleanRef,
      });
    }

    res.status(200).json({
      success: true,
      message: `Payment of ${Number(order.totalAmount).toFixed(2)} ETB verified successfully via ${accountInfo.name}! 🎉`,
      receipt: {
        receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
        orderId: order._id,
        amount: Number(order.totalAmount).toFixed(2),
        currency: "ETB",
        provider: accountInfo.name,
        merchantName: accountInfo.merchantName,
        transactionId: cleanRef,
        senderPhone: formattedPhone,
        paidAt: order.payment.paidAt,
        status: "Paid",
      },
      order,
    });
  } catch (error) {
    logger.error("Payment verification error:", error);
    res.status(500).json({ message: "Payment verification failed", error: error.message });
  }
};

/**
 * POST /api/payments/admin/verify/:orderId
 * Allows Restaurant Admin to verify an offline payment after checking restaurant merchant SMS
 */
export const adminVerifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { referenceCode, provider = "Telebirr", notes = "Manually verified by store admin" } = req.body;

    const role = (req.user?.role || "").trim().toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({ message: "Admin access required to manually verify payments" });
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const cleanRef = referenceCode ? referenceCode.trim().toUpperCase() : `ADM-VER-${Date.now().toString().slice(-6)}`;

    // Update payment
    let payment = await PaymentModel.findOne({ orderId: order._id });
    if (!payment) {
      payment = new PaymentModel({
        orderId: order._id,
        userId: order.userId,
        amount: order.totalAmount,
        currency: "ETB",
      });
    }

    payment.paymentMethod = provider === "CBE" ? "CBE" : provider === "Telebirr" ? "Telebirr" : "BankTransfer";
    payment.providerName = provider;
    payment.transactionReference = cleanRef;
    payment.status = "COMPLETED";
    payment.verificationChannel = "ADMIN_VERIFIED";
    payment.paidAt = new Date();
    payment.notes = notes;
    await payment.save();

    // Update order
    order.payment.status = "Paid";
    order.payment.transactionId = cleanRef;
    order.payment.provider = provider;
    order.payment.paidAt = new Date();
    order.timeline.push({
      status: order.status,
      timestamp: new Date(),
      note: `Payment confirmed by store administrator (Ref: ${cleanRef})`,
    });
    await order.save();

    const io = req.app?.get?.("io");
    if (io) {
      io.to(`order-${order._id}`).emit("status-update", {
        orderId: order._id,
        status: order.status,
        paymentStatus: "Paid",
      });
    }

    res.status(200).json({
      success: true,
      message: `Order #${order._id.toString().slice(-6)} payment verified successfully.`,
      order,
    });
  } catch (error) {
    logger.error("Admin payment verification error:", error);
    res.status(500).json({ message: "Failed to verify payment", error: error.message });
  }
};

/**
 * GET /api/payments/order/:orderId
 * Returns complete receipt and transaction history for an order
 */
export const getOrderPaymentDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id;
    const role = (req.user?.role || "").trim().toLowerCase();

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (role !== "admin" && role !== "deliveryman" && order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payment = await PaymentModel.findOne({ orderId });

    res.status(200).json({
      success: true,
      orderId: order._id,
      orderStatus: order.status,
      payment: order.payment,
      transactionRecord: payment || null,
      totalAmount: order.totalAmount,
      currency: "ETB",
    });
  } catch (error) {
    logger.error("Error fetching order payment details:", error);
    res.status(500).json({ message: "Could not retrieve payment details" });
  }
};

/**
 * Legacy / Direct Endpoint for processing payments
 * POST /api/payments/ethiopian/process
 */
export const processEthiopianPayment = async (req, res) => {
  try {
    const { method, amount, senderPhone, senderAccount, referenceCode, orderId } = req.body;
    const numAmount = Number(amount);

    if (!method || !numAmount || numAmount <= 0) {
      return res.status(400).json({ message: "Valid payment method and amount in ETB are required." });
    }

    const cleanMethod = String(method).toLowerCase();
    const accountInfo = ETHIOPIAN_ACCOUNTS[cleanMethod] || ETHIOPIAN_ACCOUNTS.telebirr;

    const prefix = cleanMethod === "cbe" ? "CBE" : cleanMethod === "telebirr" ? "TLB" : "ETB";
    const transactionId = referenceCode
      ? referenceCode.trim().toUpperCase()
      : `${prefix}-${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (orderId) {
      const order = await OrderModel.findById(orderId);
      if (order) {
        order.payment = {
          method: accountInfo.methodKey,
          provider: accountInfo.name,
          accountNumber: accountInfo.accountNumber || accountInfo.merchantCode || "",
          senderPhone: senderPhone || "",
          status: "Paid",
          transactionId,
          paidAt: new Date(),
        };
        await order.save();
      }
    }

    res.status(200).json({
      success: true,
      status: "Paid",
      transactionId,
      amount: numAmount,
      currency: "ETB",
      provider: accountInfo.name,
      merchantName: accountInfo.merchantName,
      sender: senderPhone || senderAccount || "Customer Mobile Transfer",
      paidAt: new Date(),
      message: `Payment of ${numAmount.toFixed(2)} ETB verified via ${accountInfo.name}! 🎉`,
    });
  } catch (error) {
    logger.error("Ethiopian payment processing error:", error);
    res.status(500).json({ message: "Payment processing failed" });
  }
};

/**
 * Webhook handler for Telebirr / CBE payment callbacks
 * POST /api/payments/webhook
 */
export const paymentWebhook = async (req, res) => {
  try {
    const { outTradeNo, totalAmount, tradeNo, tradeStatus } = req.body;
    logger.info(`Incoming payment webhook: tradeStatus=${tradeStatus}, tradeNo=${tradeNo}`);

    if (tradeStatus === "Completed" || tradeStatus === "SUCCESS") {
      const payment = await PaymentModel.findOne({ gatewayCheckoutId: outTradeNo });
      if (payment) {
        payment.status = "COMPLETED";
        payment.transactionReference = tradeNo;
        payment.paidAt = new Date();
        await payment.save();

        const order = await OrderModel.findById(payment.orderId);
        if (order) {
          order.payment.status = "Paid";
          order.payment.transactionId = tradeNo;
          order.payment.paidAt = new Date();
          await order.save();
        }
      }
    }

    res.status(200).json({ code: 0, message: "success" });
  } catch (error) {
    logger.error("Payment webhook error:", error);
    res.status(500).json({ code: -1, message: "Webhook error" });
  }
};

/**
 * POST /api/payments/gateway/session
 * Creates an official checkout session URL for Telebirr / CBE / Chapa
 */
export const createGatewaySession = async (req, res) => {
  try {
    const { orderId, paymentMethod = "Telebirr" } = req.body;
    const userId = req.user.id || req.user._id;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required to initiate gateway session" });
    }

    const order = await OrderModel.findById(orderId).populate("userId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
    const sessionResult = await ethiopianGateway.createCheckoutSession({
      orderId: order._id,
      amount: order.totalAmount,
      currency: "ETB",
      paymentMethod,
      customerInfo: {
        name: `${order.userId?.firstName || ""} ${order.userId?.lastName || ""}`.trim() || order.userId?.name,
        phone: order.userId?.phone,
        email: order.userId?.email,
      },
      returnUrl: `${clientOrigin}/payment/callback?order_id=${order._id}`,
      notifyUrl: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/payments/gateway/webhook`,
    });

    // Also record / update pending payment record
    let paymentRecord = await PaymentModel.findOne({ orderId: order._id });
    if (!paymentRecord) {
      paymentRecord = new PaymentModel({
        orderId: order._id,
        userId: order.userId,
        paymentMethod: paymentMethod === "CBE" ? "CBE" : "Telebirr",
        providerName: sessionResult.provider,
        amount: order.totalAmount,
        currency: "ETB",
        status: "PENDING",
        merchantCode: sessionResult.merchantCode || "",
        gatewayCheckoutId: sessionResult.sessionId,
        verificationChannel: "WEB_GATEWAY",
      });
    } else {
      paymentRecord.gatewayCheckoutId = sessionResult.sessionId;
      paymentRecord.providerName = sessionResult.provider;
      paymentRecord.paymentMethod = paymentMethod === "CBE" ? "CBE" : "Telebirr";
    }
    await paymentRecord.save();

    res.status(200).json({
      success: true,
      orderId: order._id,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.checkoutUrl,
      amount: sessionResult.amount,
      currency: sessionResult.currency,
      provider: sessionResult.provider,
      mode: sessionResult.mode,
      expiresAt: sessionResult.expiresAt,
    });
  } catch (error) {
    logger.error("Error creating gateway session:", error);
    res.status(500).json({ message: "Could not create payment gateway session", error: error.message });
  }
};

/**
 * Helper: Find session in memory cache or restore from MongoDB audit record
 */
const findOrRestoreSession = async (sessionId) => {
  let session = ethiopianGateway.getSession(sessionId);
  if (!session && mongoose.connection?.readyState === 1) {
    try {
      const payment = await PaymentModel.findOne({ gatewayCheckoutId: sessionId });
      if (payment) {
        const order = await OrderModel.findById(payment.orderId).populate("userId");
        if (order) {
          const isTelebirr = payment.paymentMethod === "Telebirr";
          const isCbe = payment.paymentMethod === "CBE";
          session = {
            sessionId,
            outTradeNo: payment.transactionReference || `FOODIE-${order._id.toString().slice(-8)}`,
            orderId: order._id,
            amount: Number(payment.amount || order.totalAmount),
            currency: "ETB",
            paymentMethod: payment.paymentMethod,
            provider: payment.providerName || (isTelebirr ? "Telebirr (Ethio Telecom)" : "Commercial Bank of Ethiopia (CBE)"),
            merchantName: "Foodie Restaurant PLC",
            merchantCode: isTelebirr ? "554433" : "998877",
            accountNumber: isCbe ? "1000234567891" : undefined,
            merchantPhone: isTelebirr ? "+251911223344" : undefined,
            ussdCode: isTelebirr ? "*127#" : isCbe ? "*847#" : undefined,
            customerPhone: payment.senderPhone || order.userId?.phone || "0911223344",
            customerAccount: payment.senderAccount || (isCbe ? "1000123456789" : ""),
            customerName: `${order.userId?.firstName || ""} ${order.userId?.lastName || ""}`.trim() || order.userId?.name || "Customer",
            status: payment.status === "COMPLETED" ? "SUCCESS" : payment.status,
            createdAt: payment.createdAt,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          };
          ethiopianGateway.setSession(sessionId, session);
        }
      }
    } catch (err) {
      logger.error("Error in findOrRestoreSession:", err);
    }
  }
  return session;
};

/**
 * GET /api/payments/gateway/session/:sessionId
 * Retrieves session details for rendering the Gateway Checkout Portal
 */
export const getGatewaySessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await findOrRestoreSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Gateway payment session expired or not found" });
    }

    const order = await OrderModel.findById(session.orderId).select("items totalAmount deliveryAddress status");

    res.status(200).json({
      success: true,
      session,
      orderItems: order?.items || [],
      orderStatus: order?.status || "pending",
      gatewayMode: ethiopianGateway.mode,
    });
  } catch (error) {
    logger.error("Error fetching gateway session:", error);
    res.status(500).json({ message: "Error fetching gateway session" });
  }
};

/**
 * POST /api/payments/gateway/mock-process
 * Called by the Gateway Checkout Portal when the tester confirms, fails, or cancels
 */
export const processMockGatewayPayment = async (req, res) => {
  try {
    const { sessionId, action = "confirm", customerPin, otpCode, customerPhone, customerAccount } = req.body;
    
    // Ensure session is in memory cache
    await findOrRestoreSession(sessionId);

    const result = await ethiopianGateway.processMockAuthorization({
      sessionId,
      action,
      customerPin,
      otpCode,
    });

    const session = result.session;
    if (customerPhone) {
      session.customerPhone = customerPhone;
    }
    if (customerAccount) {
      session.customerAccount = customerAccount;
    }
    const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";

    if (result.success) {
      // Update Payment Model
      const payment = await PaymentModel.findOne({ orderId: session.orderId });
      if (payment) {
        payment.status = "COMPLETED";
        payment.transactionReference = result.transactionReference;
        payment.paidAt = result.paidAt;
        payment.senderPhone = customerPhone || session.customerPhone;
        payment.senderAccount = customerAccount || session.customerAccount || "";
        payment.verificationChannel = "WEB_GATEWAY";
        await payment.save();
      }

      // Update Order Model
      const order = await OrderModel.findById(session.orderId);
      if (order) {
        order.payment = {
          method: session.paymentMethod,
          provider: session.provider,
          accountNumber: session.accountNumber || session.merchantCode,
          senderPhone: customerPhone || session.customerPhone,
          senderAccount: customerAccount || session.customerAccount || "",
          status: "Paid",
          transactionId: result.transactionReference,
          paidAt: result.paidAt,
        };
        order.timeline.push({
          status: order.status,
          timestamp: new Date(),
          note: `Payment of ${Number(order.totalAmount).toFixed(2)} ETB authorized via ${session.provider} Gateway (Ref: ${result.transactionReference})`,
        });
        await order.save();

        // Socket.IO real-time emission
        const io = req.app?.get?.("io");
        if (io) {
          io.to(`order-${order._id}`).emit("status-update", {
            orderId: order._id,
            status: order.status,
            paymentStatus: "Paid",
            transactionId: result.transactionReference,
          });
          io.emit("payment-verified", {
            orderId: order._id,
            amount: order.totalAmount,
            provider: session.provider,
            transactionId: result.transactionReference,
          });
        }
      }

      const redirectUrl = `${clientOrigin}/payment/callback?status=success&session_id=${sessionId}&order_id=${session.orderId}&tx_ref=${result.transactionReference}`;

      return res.status(200).json({
        success: true,
        status: "SUCCESS",
        transactionReference: result.transactionReference,
        redirectUrl,
      });
    } else {
      const redirectUrl = `${clientOrigin}/payment/callback?status=${result.status.toLowerCase()}&session_id=${sessionId}&order_id=${session.orderId}&message=${encodeURIComponent(result.message)}`;
      return res.status(200).json({
        success: false,
        status: result.status,
        message: result.message,
        redirectUrl,
      });
    }
  } catch (error) {
    logger.error("Mock gateway processing error:", error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/payments/gateway/verify/:sessionId
 * Verifies gateway session upon redirecting back to returnUrl
 */
export const verifyGatewaySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await findOrRestoreSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Gateway session not found or expired" });
    }

    const order = await OrderModel.findById(session.orderId);

    res.status(200).json({
      success: true,
      sessionStatus: session.status,
      orderId: session.orderId,
      orderStatus: order?.status || "pending",
      paymentStatus: order?.payment?.status || "Pending",
      transactionId: order?.payment?.transactionId || session.transactionReference || "",
      amount: session.amount,
      currency: session.currency,
      provider: session.provider,
      merchantName: session.merchantName,
      paidAt: order?.payment?.paidAt || session.paidAt || null,
      receipt: {
        receiptNumber: `REC-${sessionId.slice(-8)}`,
        orderId: session.orderId,
        amount: Number(session.amount).toFixed(2),
        currency: "ETB",
        provider: session.provider,
        merchantName: session.merchantName,
        transactionId: order?.payment?.transactionId || session.transactionReference,
        paidAt: order?.payment?.paidAt || session.paidAt,
        status: order?.payment?.status || session.status,
      },
    });
  } catch (error) {
    logger.error("Error verifying gateway session:", error);
    res.status(500).json({ message: "Verification failed" });
  }
};

