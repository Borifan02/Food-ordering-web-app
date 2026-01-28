import { OrderModel } from "../models/order.model.js";
import { ItemModel } from "../models/menuItem.model.js";

export const createOrder = async (req, res) => {
    try {
        const { items, deliveryAddress, paymentMethod } = req.body;
        const userId = req.user.id; // JWT uses 'id' field
        
        console.log("Creating order for user:", userId);
        console.log("Order data:", { items, deliveryAddress, paymentMethod });

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items in order" });
        }

        // 1. Calculate total amount securely
        let totalAmount = 0;
        // We iterate through items sent by user to check prices in DB
        for (let item of items) {
            const dbItem = await ItemModel.findById(item.menuItemId);
            if (!dbItem) {
                console.log(`Item not found in DB: ${item.menuItemId} - ${item.name}`);
                return res.status(404).json({ message: `Item not found: ${item.name}` });
            }
            totalAmount += dbItem.price * item.quantity;
        }

        // 2. Create Order
        const newOrder = new OrderModel({
            userId,
            items,
            totalAmount,
            deliveryAddress,
            payment: {
                method: paymentMethod || "Cash",
                status: "Pending"
            },
            status: "pending",
            estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000) // 45 minutes
        });

        await newOrder.save();
        
        // Real-time notification
        const io = req.app.get('io');
        io.emit('new-order', {
            orderId: newOrder._id,
            totalAmount,
            items: items.length
        });

        res.status(201).json({ message: "Order placed successfully", orderId: newOrder._id });
    } catch (error) {
        console.error("Order creation error:", error);
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
        // Security: Ensure the user requesting is the one who made the order (or is Admin)
        if (req.user.role !== "admin" && req.user.role !== "Chief" && order.userId.toString() !== userId) {
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
        const { status } = req.body;
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
            { status },
            { new: true }
        );
        
        // Real-time status update
        const io = req.app.get('io');
        io.to(`order-${req.params.id}`).emit('status-update', {
            orderId: req.params.id,
            status,
            timestamp: new Date()
        });

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
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