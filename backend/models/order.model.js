import { Schema, Types, model } from "mongoose";

export const orderSchema = Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "Preparing", "onTheWay", "delivered", "cancelled"],
      default: "pending",
      required: true,
    },
    deliveryManId: {
      type: Types.ObjectId,
      ref: "DeliveryMan",
      default: null,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    orderNotes: {
      type: String,
      default: "",
    },
    estimatedDeliveryTime: {
      type: Date,
      default: () => new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
    },
    payment: {
      method: { 
        type: String, 
        enum: ["Cash", "Card", "Telebirr", "CBE", "CBEBirr", "BankTransfer"], 
        default: "Cash" 
      },
      provider: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      senderPhone: { type: String, default: "" },
      senderAccount: { type: String, default: "" },
      status: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending",
      },
      transactionId: { type: String, default: "" },
      paidAt: { type: Date, default: null },
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
      default: "",
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    items: [
      {
        menuItemId: { type: Types.ObjectId, ref: "menuItem" },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    cancellationReason: {
      type: String,
      default: "",
    },
    cancelledBy: {
      type: String,
      enum: ["user", "admin", ""],
      default: "",
    },
  },
  { timestamps: true }
);

export const OrderModel = model("order", orderSchema);
