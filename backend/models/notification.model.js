import { Schema, Types, model } from "mongoose";

export const notificationSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["order_placed", "order_status", "payment", "delivery", "promo", "system"],
      default: "system",
    },
    orderId: {
      type: Types.ObjectId,
      ref: "order",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "🔔",
    },
  },
  { timestamps: true }
);

export const NotificationModel = model("notification", notificationSchema);
