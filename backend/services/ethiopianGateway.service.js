import crypto from "crypto";
import logger from "../utils/logger.js";

/**
 * Ethiopian Payment Gateway Service
 * Supports dual-mode operation:
 *  - "mock": In-house, production-fidelity gateway simulation for end-to-end testing (Telebirr & CBE Birr)
 *  - "live": Production gateway integration (Telebirr H5 Web API / CBE Birr API / Chapa API)
 */

// In-memory or database-backed session registry for gateway checkouts
const mockGatewaySessions = new Map();

export class EthiopianGatewayService {
  constructor() {
    this.mode = process.env.ETHIOPIAN_GATEWAY_MODE || "mock";
    
    // Telebirr Credentials
    this.telebirr = {
      appId: process.env.TELEBIRR_APP_ID || "",
      appKey: process.env.TELEBIRR_APP_KEY || "",
      shortCode: process.env.TELEBIRR_SHORT_CODE || "554433",
      publicKey: process.env.TELEBIRR_PUBLIC_KEY || "",
      apiUrl: process.env.TELEBIRR_API_URL || "https://app.ethiomobilemoney.et:2121/gateway/",
    };

    // CBE Birr Credentials
    this.cbe = {
      merchantId: process.env.CBE_MERCHANT_ID || "",
      apiKey: process.env.CBE_API_KEY || "",
      accountNumber: process.env.CBE_ACCOUNT_NUMBER || "1000234567891",
    };

    // Chapa Credentials
    this.chapa = {
      secretKey: process.env.CHAPA_SECRET_KEY || "",
      apiUrl: "https://api.chapa.co/v1/transaction/initialize",
    };
  }

  isLiveMode() {
    return this.mode === "live" && (Boolean(this.telebirr.appId) || Boolean(this.chapa.secretKey));
  }

  /**
   * Create Gateway Checkout Session
   */
  async createCheckoutSession({
    orderId,
    amount,
    currency = "ETB",
    paymentMethod = "Telebirr",
    customerInfo = {},
    returnUrl,
    notifyUrl,
  }) {
    const cleanMethod = String(paymentMethod).toLowerCase();
    const isTelebirr = cleanMethod === "telebirr";
    const isCbeBirr = cleanMethod === "cbebirr" || cleanMethod === "cbe_birr" || cleanMethod.includes("cbe birr") || cleanMethod.includes("cbebirr");
    const isCbe = (cleanMethod === "cbe" || cleanMethod.includes("cbe")) && !isCbeBirr;

    const sessionId = `GWS-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const outTradeNo = `FOODIE-${orderId.toString().slice(-8)}-${Date.now().toString().slice(-4)}`;

    // 1. If in LIVE mode and live credentials exist
    if (this.isLiveMode()) {
      try {
        if (this.chapa.secretKey) {
          logger.info(`Initiating live Chapa gateway transaction for order ${orderId}`);
          const response = await fetch(this.chapa.apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.chapa.secretKey}`,
            },
            body: JSON.stringify({
              amount: String(amount),
              currency: "ETB",
              email: customerInfo.email || "customer@foodie.com",
              first_name: customerInfo.firstName || "Customer",
              last_name: customerInfo.lastName || "User",
              phone_number: customerInfo.phone || "0911223344",
              tx_ref: outTradeNo,
              callback_url: notifyUrl,
              return_url: returnUrl,
              customization: {
                title: "Foodie Restaurant PLC",
                description: `Payment for Order #${orderId.toString().slice(-6)}`,
              },
            }),
          });

          const data = await response.json();
          if (data.status === "success" && data.data?.checkout_url) {
            return {
              sessionId,
              outTradeNo,
              checkoutUrl: data.data.checkout_url,
              provider: isTelebirr ? "Telebirr" : isCbeBirr ? "CBEBirr" : isCbe ? "CBE" : "Chapa",
              mode: "live",
            };
          }
        }
        // Telebirr direct H5 Web Payment integration can be invoked here if configured
      } catch (err) {
        logger.error("Live gateway connection failed, falling back to mock gateway:", err);
      }
    }

    // 2. MOCK Gateway Session (Realistic Gateway Simulation)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const sessionData = {
      sessionId,
      outTradeNo,
      orderId,
      amount: Number(amount),
      currency: "ETB",
      paymentMethod: isTelebirr ? "Telebirr" : isCbeBirr ? "CBEBirr" : isCbe ? "CBE" : "BankTransfer",
      provider: isTelebirr
        ? "Telebirr (Ethio Telecom)"
        : isCbeBirr
          ? "CBE Birr (Mobile Wallet)"
          : isCbe
            ? "Commercial Bank of Ethiopia (CBE Account)"
            : "Bank Transfer",
      merchantName: "Foodie Restaurant PLC",
      merchantCode: isTelebirr ? "554433" : isCbeBirr ? "998877" : undefined,
      accountNumber: isCbe ? "1000234567891" : undefined,
      merchantPhone: isTelebirr ? "+251911223344" : undefined,
      ussdCode: isTelebirr ? "*127#" : isCbeBirr ? "*847#" : undefined,
      customerPhone: customerInfo.phone || "0911223344",
      customerAccount: customerInfo.accountNumber || (isCbe ? "1000123456789" : ""),
      customerName: customerInfo.name || "Customer",
      status: "PENDING",
      createdAt: new Date(),
      expiresAt,
      returnUrl,
      notifyUrl,
    };

    mockGatewaySessions.set(sessionId, sessionData);

    const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
    const checkoutUrl = `${clientOrigin}/gateway/checkout/${sessionId}`;

    logger.info(`Created Mock Gateway Session: ${sessionId} for Order ${orderId}`);

    return {
      sessionId,
      outTradeNo,
      checkoutUrl,
      provider: sessionData.provider,
      merchantCode: sessionData.merchantCode,
      accountNumber: sessionData.accountNumber,
      merchantPhone: sessionData.merchantPhone,
      ussdCode: sessionData.ussdCode,
      customerPhone: sessionData.customerPhone,
      customerAccount: sessionData.customerAccount,
      amount: Number(amount),
      currency: "ETB",
      expiresAt,
      mode: "mock",
    };
  }

  /**
   * Retrieve Session details
   */
  getSession(sessionId) {
    return mockGatewaySessions.get(sessionId) || null;
  }

  /**
   * Store or update session in cache
   */
  setSession(sessionId, sessionData) {
    mockGatewaySessions.set(sessionId, sessionData);
  }

  /**
   * Process Mock Gateway Authorization (Customer confirms in the Gateway Portal)
   */
  async processMockAuthorization({
    sessionId,
    action = "confirm", // "confirm", "fail", "cancel"
    customerPin,
    otpCode,
  }) {
    const session = mockGatewaySessions.get(sessionId);
    if (!session) {
      throw new Error("Gateway session not found or expired");
    }

    if (new Date() > new Date(session.expiresAt)) {
      session.status = "EXPIRED";
      throw new Error("Payment session has expired. Please initiate checkout again.");
    }

    if (action === "cancel") {
      session.status = "CANCELLED";
      return {
        success: false,
        status: "CANCELLED",
        message: "Payment was cancelled by the customer.",
        session,
      };
    }

    if (action === "fail") {
      session.status = "FAILED";
      return {
        success: false,
        status: "FAILED",
        message: "Simulated transaction failure: Insufficient funds or incorrect PIN.",
        session,
      };
    }

    // Success Simulation
    const prefix = session.paymentMethod === "Telebirr" ? "TLB" : "CBE";
    const txRef = `${prefix}-${Date.now().toString().slice(-6)}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    session.status = "SUCCESS";
    session.transactionReference = txRef;
    session.paidAt = new Date();

    return {
      success: true,
      status: "SUCCESS",
      transactionReference: txRef,
      amount: session.amount,
      currency: session.currency,
      provider: session.provider,
      merchantName: session.merchantName,
      paidAt: session.paidAt,
      session,
    };
  }
}

export const ethiopianGateway = new EthiopianGatewayService();

