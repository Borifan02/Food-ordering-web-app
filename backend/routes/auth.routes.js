import express from "express";
import { 
    register, 
    login, 
    getProfile, 
    updateProfile, 
    toggleFavorite, 
    getFavorites,
    forgotPassword,
    resetPassword,
    changePassword,
    getSavedAddresses,
    addSavedAddress,
    deleteSavedAddress,
    setDefaultAddress,
} from "../controllers/auth.controller.js";
import { userModel } from "../models/user.model.js"; 
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected Routes (Customer, Driver, and Admin)
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);
router.post("/favorites/:itemId", verifyToken, toggleFavorite);
router.get("/favorites", verifyToken, getFavorites);
router.get("/addresses", verifyToken, getSavedAddresses);
router.post("/addresses", verifyToken, addSavedAddress);
router.delete("/addresses/:addressId", verifyToken, deleteSavedAddress);
router.patch("/addresses/:addressId/default", verifyToken, setDefaultAddress);

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
