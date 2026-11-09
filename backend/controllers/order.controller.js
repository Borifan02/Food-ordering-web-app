import { OrderModel } from "../models/order.model.js";
import { ItemModel } from "../models/menuItem.model.js";
import { CouponModel } from "../models/coupon.model.js";
import {
    sendInAppNotification,
    notifyAdmins,
    notifyDeliveryDrivers,
} from "./notification.controller.js";
import logger from "../utils/logger.js";

export const createOrder = async (req, res) => {
    try {
        const {
            items,
            deliveryAddress,
            paymentMethod,
            orderNotes = "",
            couponCode = "",
            isScheduled = false,
            scheduledDeliveryTime = null,
            tipAmount = 0,
        } = req.body;
        const userId = req.user.id; // JWT uses 'id' field
        const userRole = (req.user?.role || "").trim().toLowerCase();

        if (userRole === "admin" || userRole === "deliveryman") {
            return res.status(403).json({
                message: "Placing orders is restricted to customers. Admins and Delivery Drivers cannot create customer orders."
            });
        }

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

        const parsedTip = Math.max(0, Math.round(Number(tipAmount || 0) * 100) / 100);
        totalAmount = Math.max(0, Math.round((subtotal + deliveryFee - discountAmount + parsedTip) * 100) / 100);

        // 2. Create Order
        const newOrder = new OrderModel({
            userId,
            items,
            subtotal,
            deliveryFee,
            discountAmount,
            couponCode: appliedCouponCode,
            tipAmount: parsedTip,
            totalAmount,
            deliveryAddress,
            orderNotes,
            payment: {
                method: paymentMethod || "Cash",
                provider: req.body.paymentProvider || "",
                accountNumber: req.body.paymentAccount || "",
                status: (paymentMethod === "Card" || paymentMethod === "Telebirr" || paymentMethod === "CBE") && (req.body.transactionId || req.body.paymentIntentId)
                    ? "Paid"
                    : paymentMethod === "Card"
                    ? "Paid"
                    : "Pending",
                transactionId: req.body.transactionId || req.body.paymentIntentId || "",
                paidAt: req.body.transactionId ? new Date() : null,
            },
            status: "pending",
            isScheduled: Boolean(isScheduled),
            scheduledDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : null,
            estimatedDeliveryTime: scheduledDeliveryTime ? new Date(scheduledDeliveryTime) : new Date(Date.now() + 45 * 60 * 1000),
            timeline: [
                {
                    status: "pending",
                    timestamp: new Date(),
                    note: isScheduled ? `Order scheduled for ${new Date(scheduledDeliveryTime).toLocaleString()}` : "Order received by restaurant"
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

        // Send in-app notification to customer
        try {
            sendInAppNotification({
                userId,
                title: isScheduled ? "🕒 Scheduled Order Placed!" : "🎉 Order Placed Successfully!",
                message: `Order #${newOrder._id?.toString?.().slice(-6) || "ID"} (${totalAmount.toFixed(2)} ETB) has been received.`,
                type: "order_placed",
                orderId: newOrder._id,
                link: `/orders/${newOrder._id}`,
                icon: isScheduled ? "🕒" : "🍕",
                io
            }).catch(e => logger.error("In-app notification err:", e));
        } catch (e) {
            // Non-blocking in tests or when unmocked
        }

        // Notify admins about new incoming order
        try {
            notifyAdmins({
                title: "🔔 New Order Received!",
                message: `Order #${newOrder._id?.toString?.().slice(-6) || "ID"} (${totalAmount.toFixed(2)} ETB, ${items.length} items) placed.`,
                type: "order_placed",
                orderId: newOrder._id,
                link: "/admin?tab=orders",
                icon: "📋",
                io
            }).catch(e => logger.error("Admin order notification err:", e));
        } catch (e) {}

        // Notify available delivery drivers about delivery opportunity
        try {
            notifyDeliveryDrivers({
                title: "🛵 New Order Available",
                message: `Order #${newOrder._id?.toString?.().slice(-6) || "ID"} (${items.length} items) is available for delivery.`,
                type: "delivery",
                orderId: newOrder._id,
                link: "/delivery",
                icon: "🛵",
                io
            }).catch(e => logger.error("Delivery drivers notification err:", e));
        } catch (e) {}

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

        // Send in-app status update notification to customer
        try {
            const statusIcons = {
                confirmed: "✅",
                preparing: "👨‍🍳",
                onTheWay: "🚚",
                on_delivery: "🚚",
                delivered: "🎉",
                cancelled: "❌",
            };
            const statusLabels = {
                confirmed: "Order Confirmed",
                preparing: "Kitchen Cooking",
                onTheWay: "Courier On The Way",
                on_delivery: "Out for Delivery",
                delivered: "Order Delivered!",
                cancelled: "Order Cancelled",
            };
            const statusMessages = {
                confirmed: "The restaurant has confirmed your order.",
                preparing: "Your delicious dishes are being prepared fresh in the kitchen.",
                onTheWay: "Courier has picked up your food and is heading to your address.",
                on_delivery: "Your food is out for delivery and will arrive shortly.",
                delivered: "Your order has been delivered! Enjoy your meal.",
                cancelled: "Your order has been cancelled.",
            };

            sendInAppNotification({
                userId: order.userId,
                title: statusLabels[status] || `Order Status: ${String(status).replace('_', ' ').toUpperCase()}`,
                message: statusMessages[status] || `Your order #${req.params.id.slice(-6)} is now ${String(status).replace('_', ' ')}.`,
                type: "order_status",
                orderId: req.params.id,
                link: `/orders/${req.params.id}`,
                icon: statusIcons[status] || "📦",
                io
            }).catch(e => logger.error("In-app status notification err:", e));

            // Alert couriers when order is ready for delivery
            if (status === "preparing" || status === "confirmed" || status === "ready") {
                notifyDeliveryDrivers({
                    title: "🛵 Delivery Order Update",
                    message: `Order #${req.params.id.slice(-6)} status updated to ${status}. Be ready for pickup!`,
                    type: "delivery",
                    orderId: req.params.id,
                    link: "/delivery",
                    icon: "🛵",
                    io
                }).catch(e => logger.error("Driver status notification err:", e));
            }
        } catch (e) {
            // Non-blocking
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

        // Notify stakeholders of order cancellation
        try {
            if (isOwner) {
                // Cancelled by customer -> notify all restaurant admins
                notifyAdmins({
                    title: "⚠️ Order Cancelled by Customer",
                    message: `Order #${id.slice(-6)} was cancelled by customer. Reason: ${reason}`,
                    type: "order_status",
                    orderId: id,
                    link: "/admin?tab=orders",
                    icon: "⚠️",
                    io
                }).catch(e => logger.error("Admin cancel notification err:", e));
            } else {
                // Cancelled by admin -> notify customer
                sendInAppNotification({
                    userId: order.userId,
                    title: "❌ Order Cancelled by Restaurant",
                    message: `Order #${id.slice(-6)} was cancelled. Reason: ${reason}`,
                    type: "order_status",
                    orderId: id,
                    link: `/orders/${id}`,
                    icon: "❌",
                    io
                }).catch(e => logger.error("Customer cancel notification err:", e));
            }

            // If driver was assigned -> notify driver
            if (order.deliveryManId) {
                sendInAppNotification({
                    userId: order.deliveryManId,
                    title: "⚠️ Assigned Delivery Cancelled",
                    message: `Order #${id.slice(-6)} has been cancelled. No delivery required.`,
                    type: "delivery",
                    orderId: id,
                    link: "/delivery",
                    icon: "⚠️",
                    io
                }).catch(e => logger.error("Driver cancel notification err:", e));
            }
        } catch (e) {}

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
                    message: "TASTY20 requires a minimum order of 20.00 ETB"
                });
            }
            const discount = Math.round(subtotal * 0.2 * 100) / 100;
            return res.status(200).json({
                valid: true,
                code: upperCode,
                discount,
                description: "20% off orders over 20 ETB"
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

/**
 * GET /api/orders/:id/messages
 * Retrieve live in-app chat messages for a specific order
 */
export const getOrderMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await OrderModel.findById(id).select("messages userId deliveryManId");
        if (!order) return res.status(404).json({ message: "Order not found" });

        const userId = (req.user?.id || req.user?._id || "").toString();
        const role = (req.user?.role || "").toLowerCase();
        const isOwner = order.userId?.toString() === userId;
        const isDriver = order.deliveryManId?.toString() === userId;
        const isAdmin = role === "admin";

        if (!isOwner && !isDriver && !isAdmin) {
            return res.status(403).json({ message: "Access denied to order messages" });
        }

        res.status(200).json(order.messages || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/orders/:id/messages
 * Send a live in-app chat message on an order thread
 */
export const sendOrderMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Message text cannot be empty" });
        }

        const order = await OrderModel.findById(id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const userId = (req.user?.id || req.user?._id || "").toString();
        const role = (req.user?.role || "customer").toLowerCase();
        const isOwner = order.userId?.toString() === userId;
        const isDriver = order.deliveryManId?.toString() === userId;
        const isAdmin = role === "admin";

        if (!isOwner && !isDriver && !isAdmin) {
            return res.status(403).json({ message: "Access denied to order messages" });
        }

        const senderRole = isAdmin ? "admin" : isDriver ? "deliveryman" : "customer";
        const senderName =
            req.user?.firstName ||
            req.user?.name ||
            (isAdmin ? "Restaurant Kitchen" : isDriver ? "Delivery Courier" : "Customer");

        const newMessage = {
            senderId: userId,
            senderName,
            senderRole,
            text: text.trim(),
            timestamp: new Date(),
        };

        if (!Array.isArray(order.messages)) {
            order.messages = [];
        }
        order.messages.push(newMessage);
        await order.save();

        const io = req.app?.get?.("io");
        if (io) {
            io.to(`order-${id}`).emit("order-message", {
                orderId: id,
                message: newMessage,
            });
        }

        res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/orders/:id/location
 * Driver streams current GPS coordinates for real-time order map tracking
 */
export const updateDriverLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude, heading = 0 } = req.body;

        if (typeof latitude !== "number" || typeof longitude !== "number") {
            return res.status(400).json({ message: "Valid latitude and longitude required" });
        }

        const order = await OrderModel.findById(id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const coords = {
            latitude,
            longitude,
            heading,
            updatedAt: new Date(),
        };

        order.driverLocation = coords;
        await order.save();

        const io = req.app?.get?.("io");
        if (io) {
            io.to(`order-${id}`).emit("driver-location", {
                orderId: id,
                coords,
            });
        }

        res.status(200).json({ success: true, coords });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
