import { userModel } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    try {
        const { firstName = "", lastName = "", email = "", password = "", confirmPassword = "", phone = "", address = "" } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        
        // Validate first and last name length
        if (firstName.length < 3) {
            return res.status(400).json({ message: "First name must be at least 3 characters long" });
        }
        if (lastName.length < 3) {
            return res.status(400).json({ message: "Last name must be at least 3 characters long" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        if (phone.length !== 11) {
            return res.status(400).json({ message: "Phone number must be 11 digits long" });
        }

        // Check if an account with this email already exists
        if (typeof userModel.findOne === "function") {
            const existingUser = await userModel.findOne({ email: normalizedEmail });
            if (existingUser) {
                return res.status(400).json({ message: "An account with this email already exists. Please sign in or use another email." });
            }
        }

        try {
            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            if (typeof DeliveryManModel?.findOne === "function") {
                const existingDriver = await DeliveryManModel.findOne({ email: normalizedEmail });
                if (existingDriver) {
                    return res.status(400).json({ message: "This email is registered as a delivery driver account." });
                }
            }
        } catch (_) {}

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            firstName,
            lastName,
            email: normalizedEmail,
            password: hashedPassword,
            confirmPassword: hashedPassword,
            phone,
            address
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email = "", password = "" } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        // First, try to find user in userModel (latest record first if duplicates exist)
        let user;
        const userQuery = userModel.findOne({ email: normalizedEmail });
        if (typeof userQuery?.sort === "function") {
            user = await userQuery.sort({ createdAt: -1, _id: -1 });
        } else {
            user = await userQuery;
        }

        let isDeliveryMan = false;

        // If not found in userModel, check DeliveryManModel
        if (!user) {
            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            if (typeof DeliveryManModel?.findOne === "function") {
                const deliveryQuery = DeliveryManModel.findOne({ email: normalizedEmail });
                if (typeof deliveryQuery?.sort === "function") {
                    user = await deliveryQuery.sort({ createdAt: -1, _id: -1 });
                } else {
                    user = await deliveryQuery;
                }
                if (user) {
                    isDeliveryMan = true;
                }
            }
        }

        // Auto-provision demo account on-the-fly if someone logs in with a demo role and it was missing
        if (!user && (normalizedEmail === "admin@foodie.com" || normalizedEmail === "user@foodie.com" || normalizedEmail === "delivery@foodie.com")) {
            try {
                const { ensureDemoAccounts } = await import("../utils/ensureDemo.js");
                await ensureDemoAccounts();
                if (normalizedEmail === "delivery@foodie.com") {
                    const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
                    user = await DeliveryManModel.findOne({ email: normalizedEmail });
                    if (user) isDeliveryMan = true;
                } else {
                    user = await userModel.findOne({ email: normalizedEmail });
                }
            } catch (_) {}
        }

        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "foodie_default_jwt_secret_key_2026",
            { expiresIn: process.env.JWT_EXPIRE || "30d" }
        );

        // Send back token and non-sensitive user data
        const plainUser = typeof user.toObject === "function" ? user.toObject() : (user._doc || user);
        const { password: _, confirmPassword: __, ...userData } = plainUser;
        res.status(200).json({ token, user: userData });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        let user = await userModel.findById(req.user.id).select("-password");
        if (!user) {
            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            if (typeof DeliveryManModel?.findById === "function") {
                const query = DeliveryManModel.findById(req.user.id);
                user = typeof query?.select === "function" ? await query.select("-password") : await query;
            } else if (typeof DeliveryManModel?.findOne === "function") {
                user = await DeliveryManModel.findOne({ _id: req.user.id });
            }
        }
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, address, savedAddresses } = req.body;
        const updates = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (phone) updates.phone = phone;
        if (typeof address !== "undefined") updates.address = address;
        if (Array.isArray(savedAddresses)) updates.savedAddresses = savedAddresses;

        let user = await userModel.findByIdAndUpdate(req.user.id, updates, { new: true });
        if (!user) {
            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            if (typeof DeliveryManModel?.findByIdAndUpdate === "function") {
                user = await DeliveryManModel.findByIdAndUpdate(req.user.id, updates, { new: true });
            }
        }
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const toggleFavorite = async (req, res) => {
    try {
        const { itemId } = req.params;
        const user = await userModel.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!Array.isArray(user.favorites)) {
            user.favorites = [];
        }
        const index = user.favorites.findIndex((id) => id?.toString?.() === itemId);
        let isFavorite = false;
        if (index > -1) {
            user.favorites.splice(index, 1);
            isFavorite = false;
        } else {
            user.favorites.push(itemId);
            isFavorite = true;
        }
        await user.save();

        res.status(200).json({
            message: isFavorite ? "Added to favorites" : "Removed from favorites",
            isFavorite,
            favorites: user.favorites
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFavorites = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id).populate("favorites");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.favorites || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Request Password Reset Code
 * Handles Customers, Drivers, and Admins
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email = "" } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        if (!normalizedEmail) {
            return res.status(400).json({ message: "Please enter your email address" });
        }

        // Search in userModel first
        let user = null;
        let isDriver = false;

        const userQuery = userModel.findOne({ email: normalizedEmail });
        if (typeof userQuery?.sort === "function") {
            user = await userQuery.sort({ createdAt: -1, _id: -1 });
        } else {
            user = await userQuery;
        }

        // If not in userModel, check DeliveryManModel
        if (!user) {
            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            if (typeof DeliveryManModel?.findOne === "function") {
                const driverQuery = DeliveryManModel.findOne({ email: normalizedEmail });
                if (typeof driverQuery?.sort === "function") {
                    user = await driverQuery.sort({ createdAt: -1, _id: -1 });
                } else {
                    user = await driverQuery;
                }
                if (user) isDriver = true;
            }
        }

        if (!user) {
            return res.status(404).json({
                message: "No registered account found with this email address. Please verify your email or sign up."
            });
        }

        // Generate a 6-digit verification code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        // 15 minutes expiration
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = expiresAt;
        await user.save();

        res.status(200).json({
            message: "A password reset code has been generated. Use this 6-digit code to reset your password.",
            email: normalizedEmail,
            resetCode: resetCode,
            expiresInMinutes: 15
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: error.message || "Failed to process forgot password request" });
    }
};

/**
 * Reset Password using 6-Digit Code
 * Handles Customers, Drivers, and Admins
 */
export const resetPassword = async (req, res) => {
    try {
        const { email = "", resetCode = "", newPassword = "", confirmPassword = "" } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const code = (resetCode || "").toString().trim();

        if (!normalizedEmail || !code || !newPassword) {
            return res.status(400).json({ message: "Email, reset code, and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Find user
        let user = await userModel.findOne({ email: normalizedEmail });
        if (!user) {
            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            if (typeof DeliveryManModel?.findOne === "function") {
                user = await DeliveryManModel.findOne({ email: normalizedEmail });
            }
        }

        if (!user) {
            return res.status(404).json({ message: "Account not found" });
        }

        if (!user.resetPasswordToken || !user.resetPasswordExpires) {
            return res.status(400).json({ message: "No active password reset request found. Please request a new code." });
        }

        if (new Date() > new Date(user.resetPasswordExpires)) {
            return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
        }

        if (user.resetPasswordToken.trim() !== code) {
            return res.status(400).json({ message: "Invalid reset code. Please check the 6-digit code and try again." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        if (typeof user.confirmPassword !== "undefined") {
            user.confirmPassword = hashedPassword;
        }
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({
            message: "Password reset successful! You can now sign in with your new password."
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: error.message || "Failed to reset password" });
    }
};

/**
 * Change Password (for logged-in users at any time)
 * Handles Customers, Drivers, and Admins
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword = "", newPassword = "", confirmPassword = "" } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please sign in." });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match" });
        }

        // Find user
        let user = await userModel.findById(userId);
        if (!user) {
            const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
            if (typeof DeliveryManModel?.findById === "function") {
                user = await DeliveryManModel.findById(userId);
            } else if (typeof DeliveryManModel?.findOne === "function") {
                user = await DeliveryManModel.findOne({ _id: userId });
            }
        }

        if (!user) {
            return res.status(404).json({ message: "User account not found" });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect. Please try again." });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from your current password" });
        }

        // Hash and save new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        if (typeof user.confirmPassword !== "undefined") {
            user.confirmPassword = hashedPassword;
        }
        await user.save();

        res.status(200).json({
            message: "Password changed successfully! 🔒"
        });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: error.message || "Failed to change password" });
    }
};
