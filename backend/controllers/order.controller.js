import { OrderModel } from "../models/order.model.js";
import { ItemModel } from "../models/menuItem.model.js";
import { CouponModel } from "../models/coupon.model.js";
import logger from "../utils/logger.js";

export const createOrder = async (req, res) => {
    try {
        const { items, deliveryAddress, paymentMethod, orderNotes = "", couponCode = "" } = req.body;
        const userId = req.user.id; // JWT uses 'id' field

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items in order" });
        }

        // 1. Calculate total amount securely
        let totalAmount = 0;
        // We iterate through items sent by user to check prices in DB
        for (let item of items) {
            const dbItem = await ItemModel.findById(item.menuItemId);
            if (!dbItem) {
                return res.status(404).json({ message: `Item not found: ${item.name}` });
            }
            totalAmount += dbItem.price * item.quantity;
        }

        let subtotal = totalAmount;
        let discountAmount = 0;
        let appliedCouponCode = "";
        let deliveryFee = subtotal >= 25 ? 0 : 3.99;

        if (couponCode) {
            const upperCode = couponCode.toUpperCase().trim();
            if (upperCode === "WELCOME10") {
                discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
                appliedCouponCode = upperCode;
            } else if (upperCode === "TASTY20") {
                discountAmount = Math.round(subtotal * 0.2 * 100) / 100;
                appliedCouponCode = upperCode;
            } else if (upperCode === "FREESHIP") {
                discountAmount = deliveryFee;
                deliveryFee = 0;
                appliedCouponCode = upperCode;
            }
        }

        totalAmount = Math.max(0, Math.round((subtotal + deliveryFee - discountAmount) * 100) / 100);

        // 2. Create Order
        const newOrder = new OrderModel({
            userId,
            items,
            subtotal,
            deliveryFee,
            discountAmount,
            couponCode: appliedCouponCode,
            totalAmount,
            deliveryAddress,
            orderNotes,
            payment: {
                method: paymentMethod || "Cash",
                status: paymentMethod === "Card" ? "Paid" : "Pending",
                transactionId: req.body.paymentIntentId || ""
            },
            status: "pending",
            estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes
            timeline: [
                {
                    status: "pending",
                    timestamp: new Date(),
                    note: "Order received by restaurant"
                }
            ]
        });

        await newOrder.save();
        
        // Emit real-time notification when Socket.IO is available.
        const io = req.app?.get?.('io');
        if (io) {
            io.emit('new-order', {
                orderId: newOrder._id,
                totalAmount,
                items: items.length
            });
        }

        res.status(201).json({ message: "Order placed successfully", orderId: newOrder._id, order: newOrder });
    } catch (error) {
        logger.error("Order creation error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const orders = await OrderModel.find({ userId }).sort({ createdAt: -1 }); // from latest to oldest
        if (!orders) return res.status(404).json({ message: "No orders found" });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Single Order (For Tracking)
export const getOrderById = async (req, res) => {
    try {
        const order = await OrderModel.findById(req.params.id).populate("items.menuItemId");
        if (!order) return res.status(404).json({ message: "Order not found" });

        const userId = req.user._id || req.user.id;
        const role = (req.user.role || "").trim().toLowerCase();

        // Security: Ensure the user requesting is the one who made the order (or is Admin)
        if (role !== "admin" && role !== "chief" && order.userId?.toString() !== userId) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Order Status (For Admin/Chief)
export const updateOrderStatus = async (req, res) => {
    try {
        const { status, note = "" } = req.body;
        const order = await OrderModel.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        // Allow user to update their own order or admin to update any order
        const userId = req.user.id;
        if (req.user.role !== "admin" && order.userId.toString() !== userId) {
            return res.status(403).json({ message: "Access denied" });
        }
        
        const updatedOrder = await OrderModel.findByIdAndUpdate(
            req.params.id,
            { 
                status,
                $push: {
                    timeline: {
                        status,
                        timestamp: new Date(),
                        note: note || `Status updated to ${status}`
                    }
                }
            },
            { new: true }
        );
        
        // Emit status updates when Socket.IO is available.
        const io = req.app?.get?.('io');
        if (io) {
            io.to(`order-${req.params.id}`).emit('status-update', {
                orderId: req.params.id,
                status,
                timestamp: new Date()
            });
            io.emit('order-status-changed', {
                orderId: req.params.id,
                status
            });
        }

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cancel Order
export const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = "Cancelled by user" } = req.body;
        const order = await OrderModel.findById(id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const userId = req.user.id;
        const isAdmin = req.user.role === "admin";
        const isOwner = order.userId.toString() === userId;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (order.status !== "pending") {
            return res.status(400).json({ 
                message: `Order cannot be cancelled because it is already ${order.status}` 
            });
        }

        const updatedOrder = await OrderModel.findByIdAndUpdate(
            id,
            {
                status: "cancelled",
                cancellationReason: reason,
                cancelledBy: isOwner ? "user" : "admin",
                $push: {
                    timeline: {
                        status: "cancelled",
                        timestamp: new Date(),
                        note: reason
                    }
                }
            },
            { new: true }
        );

        const io = req.app?.get?.('io');
        if (io) {
            io.to(`order-${id}`).emit('status-update', {
                orderId: id,
                status: "cancelled",
                timestamp: new Date(),
                reason
            });
            io.emit('order-cancelled', { orderId: id, reason });
        }

        res.status(200).json({ message: "Order cancelled successfully", order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Validate Coupon
export const validateCoupon = async (req, res) => {
    try {
        const { code = "", subtotal = 0 } = req.body;
        const upperCode = code.toUpperCase().trim();

        if (!upperCode) {
            return res.status(400).json({ valid: false, message: "Please provide a coupon code" });
        }

        if (upperCode === "WELCOME10") {
            const discount = Math.round(subtotal * 0.1 * 100) / 100;
            return res.status(200).json({
                valid: true,
                code: upperCode,
                discount,
                description: "10% off your entire order"
            });
        }

        if (upperCode === "TASTY20") {
            if (subtotal < 20) {
                return res.status(400).json({
                    valid: false,
                    message: "TASTY20 requires a minimum order of $20.00"
                });
            }
            const discount = Math.round(subtotal * 0.2 * 100) / 100;
            return res.status(200).json({
                valid: true,
                code: upperCode,
                discount,
                description: "20% off orders over $20"
            });
        }

        if (upperCode === "FREESHIP") {
            return res.status(200).json({
                valid: true,
                code: upperCode,
                discount: 3.99,
                isFreeShipping: true,
                description: "Free delivery on your order"
            });
        }

        try {
            const coupon = await CouponModel.findOne({ code: upperCode, isActive: true });
            if (coupon) {
                if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
                    return res.status(400).json({ valid: false, message: "Promo code has expired" });
                }
                if (subtotal < (coupon.minOrderAmount || 0)) {
                    return res.status(400).json({
                        valid: false,
                        message: `Minimum order amount of $${coupon.minOrderAmount} required for this code`
                    });
                }
                let discount = 0;
                if (coupon.discountPercent > 0) {
                    discount = Math.min(
                        Math.round(subtotal * (coupon.discountPercent / 100) * 100) / 100,
                        coupon.maxDiscount || 50
                    );
                } else if (coupon.discountAmount > 0) {
                    discount = coupon.discountAmount;
                }
                return res.status(200).json({
                    valid: true,
                    code: upperCode,
                    discount,
                    description: coupon.description || `${coupon.discountPercent}% discount`
                });
            }
        } catch {
            // ignore coupon model errors in test environments
        }

        return res.status(404).json({ valid: false, message: "Invalid or expired promo code" });
    } catch (error) {
        res.status(500).json({ valid: false, message: error.message });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await OrderModel.find()
            .populate("userId", "firstName email") // Populate user info
            .sort({ createdAt: -1 });
        if (!orders) return res.status(404).json({ message: "No orders found" });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
