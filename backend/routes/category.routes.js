import express from "express";
import { categoryModel } from "../models/category.model.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const categories = await categoryModel.find({ isActive: true });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/all", verifyAdmin, async (req, res) => {
    try {
        const categories = await categoryModel.find().sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/add-category", verifyAdmin, upload.single("image"), async (req, res) => {
    try {
        const { name } = req.body;
        // Multer stores the uploaded file info in req.file
        const image = req.file ? `/uploads/${req.file.filename}` : "";

        const newCat = new categoryModel({
            name,
            image
        });

        await newCat.save();
        res.status(201).json(newCat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/:id", verifyAdmin, upload.single("image"), async (req, res) => {
    try {
        const { name, isActive } = req.body;

        const existing = await categoryModel.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: "Category not found" });
        }

        const updates = {
            name: name ?? existing.name,
        };

        if (typeof isActive !== "undefined") {
            updates.isActive = isActive;
        }

        if (req.file) {
            updates.image = `/uploads/${req.file.filename}`;
        }

        const updatedCategory = await categoryModel.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/:id", verifyAdmin, async (req, res) => {
    try {
        const deletedCategory = await categoryModel.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;