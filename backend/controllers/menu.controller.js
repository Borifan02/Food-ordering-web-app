import { ItemModel } from "../models/menuItem.model.js";
import { reviewModel } from "../models/review.model.js";

// Create Item (Admin only)
export const createMenuItem = async (req, res) => {
    try {
        const { name, description, price, categoryId } = req.body;
        // Multer adds the file object to req
        const image = req.file ? `/uploads/${req.file.filename}` : "";

        const newItem = new ItemModel({
            name, description, price, categoryId, image
        });

        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Items
export const getMenuItems = async (req, res) => {
    try {
        const items = await ItemModel.find({ isAvailable: true }).populate("categoryId");
        if (!items) {
            return res.status(404).json({ message: "No items found" });
        }
        // Calculate average rating for each item
        const itemsWithRating = await Promise.all(items.map(async (item) => {
            const reviews = await reviewModel.find({ menuItemId: item._id });
            const avgRating = reviews.length > 0
                ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
                : 0;

            return { ...item._doc, averageRating: avgRating.toFixed(1), reviewCount: reviews.length }; // spread item properties
        }));

        res.status(200).json(itemsWithRating);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all menu items for admin (including unavailable)
export const getAllMenuItems = async (req, res) => {
    try {
        const items = await ItemModel.find().populate("categoryId").sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update menu item (Admin only)
export const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, categoryId, isAvailable } = req.body;

        const existingItem = await ItemModel.findById(id);
        if (!existingItem) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        const updates = {
            name: name ?? existingItem.name,
            description: description ?? existingItem.description,
            price: price ?? existingItem.price,
            categoryId: categoryId ?? existingItem.categoryId,
        };

        if (typeof isAvailable !== "undefined") {
            updates.isAvailable = isAvailable;
        }

        if (req.file) {
            updates.image = `/uploads/${req.file.filename}`;
        }

        const updatedItem = await ItemModel.findByIdAndUpdate(id, updates, { new: true }).populate("categoryId");
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete menu item (Admin only)
export const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ItemModel.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};