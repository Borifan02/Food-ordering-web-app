import { Schema, Types, model } from "mongoose";

export const userSchema = Schema(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 3,
    },
    lastName: {
      type: String,
      required: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    confirmPassword: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "deliveryMan"],
      default: "user",
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: "",
    },
    favorites: [
      {
        type: Types.ObjectId,
        ref: "menuItem",
      },
    ],
    savedAddresses: [
      {
        label: { type: String, default: "Home" },
        address: { type: String, required: true },
      },
    ],
    avatar: {
      type: String,
      default: "",
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

export const userModel = model("user", userSchema);
