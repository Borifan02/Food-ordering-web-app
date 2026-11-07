import { Schema, Types, model } from "mongoose";

export const paymentSchema = new Schema(
  {
    orderId: {
      type: Types.ObjectId,
      ref: "order",
      required: true,
      index: true,
    },
    userId: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Telebirr", "CBE", "BankTransfer", "Card", "Cash"],
      required: true,
    },
    providerName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: "ETB",
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    senderPhone: {
      type: String,
      default: "",
    },
    senderAccount: {
      type: String,
      default: "",
    },
    senderName: {
      type: String,
      default: "",
    },
    merchantCode: {
      type: String,
      default: "",
    },
    merchantAccount: {
      type: String,
      default: "",
    },
    transactionReference: {
      type: String,
      default: "",
      index: true,
    },
    gatewayCheckoutId: {
      type: String,
      default: "",
      index: true,
    },
    verificationChannel: {
      type: String,
      enum: ["DIRECT_SMS_REF", "USSD_PUSH", "WEB_GATEWAY", "ADMIN_VERIFIED", "CASH", "STRIPE_CARD"],
      default: "DIRECT_SMS_REF",
    },
    paidAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const PaymentModel = model("payment", paymentSchema);
