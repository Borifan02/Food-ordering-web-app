import express from "express";
import { register, login, getProfile, updateProfile, toggleFavorite, getFavorites } from "../controllers/auth.controller.js";
import { userModel } from "../models/user.model.js"; 
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/login", login);

// Protected Routes
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.post("/favorites/:itemId", verifyToken, toggleFavorite);
router.get("/favorites", verifyToken, getFavorites);

// Admin Routes - promote user to admin
router.put("/make-admin", verifyAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOneAndUpdate(
            { email: email?.toLowerCase() }, 
            { role: "admin" }, 
            { new: true }
        ).select("-password -confirmPassword");
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User promoted to admin successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
