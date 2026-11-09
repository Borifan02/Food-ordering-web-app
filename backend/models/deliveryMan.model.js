import { Schema, model } from "mongoose";

const deliveryManSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    confirmPassword: { type: String, required: false },
    role: { type: String, enum: ["user", "admin", "deliveryMan"], default: "deliveryMan" },
    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    vehicleType: {
      type: String,
      enum: ["Motorcycle", "Bicycle", "Car", "Scooter"],
      default: "Scooter",
    },
    rating: {
      type: Number,
      default: 4.9,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    totalTips: {
      type: Number,
      default: 0,
    },
    currentOrderId: {
      type: Schema.Types.ObjectId,
      ref: "order",
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const DeliveryManModel = model("DeliveryMan", deliveryManSchema);
