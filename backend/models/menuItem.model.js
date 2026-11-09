import { Schema, Types, model } from "mongoose";

export const menuItemSchema = Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    categoryId: {
      type: Types.ObjectId,
      ref: "category",
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    prepTime: {
      type: String,
      default: "15-25 min",
    },
    calories: {
      type: Number,
      default: 450,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    dietaryType: {
      type: String,
      enum: ["all", "fasting", "non-fasting"],
      default: "all",
    },
    spiceLevel: {
      type: String,
      enum: ["mild", "medium", "hot"],
      default: "mild",
    },
  },
  {
    timestamps: true,
  }
);

export const ItemModel = model("menuItem", menuItemSchema);
