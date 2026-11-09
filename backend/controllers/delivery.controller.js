import { DeliveryManModel } from "../models/deliveryMan.model.js";
import { OrderModel } from "../models/order.model.js";
import {
  sendInAppNotification,
  notifyAdmins,
} from "./notification.controller.js";

// Add a new delivery man
export const createDeliveryMan = async (req, res) => {
  try {
    const { name, phone = "", email, password, confirmPassword, vehicleType = "Scooter" } = req.body;

    // match password and confirm password
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const cleanPhone = (phone || "").replace(/[\s-]/g, "");
    const isEthPhone = /^(\+251|251|0)?[79]\d{8}$/.test(cleanPhone) || (cleanPhone.length >= 9 && cleanPhone.length <= 13 && /^\+?\d+$/.test(cleanPhone));
    if (!isEthPhone) {
      return res.status(400).json({ message: "Please enter a valid Ethiopian phone number (e.g. 0911234567 or +251911234567)" });
    }

    // Hash password
    const bcrypt = await import("bcryptjs");
    const salt = await (bcrypt.default?.genSalt ? bcrypt.default.genSalt(10) : bcrypt.genSalt(10));
    const hashedPassword = await (bcrypt.default?.hash ? bcrypt.default.hash(password, salt) : bcrypt.hash(password, salt));

    const newMan = new DeliveryManModel({
      name,
      phone,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      confirmPassword: hashedPassword,
      vehicleType
    });
    await newMan.save();

    // Don't send password back in response
    const { password: _, confirmPassword: __, ...deliveryManData } = newMan._doc || newMan;
    res.status(201).json(deliveryManData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get pending orders ready for delivery
export const getPendingOrders = async (req, res) => {
  try {
    const orders = await OrderModel.find({ 
      status: { $in: ["pending", "Preparing"] } 
    })
      .populate("userId", "firstName lastName phone")
      .sort({ createdAt: 1 }); // Oldest first
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delivery man accepts an order
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const deliveryManId = req.user.id; // From JWT middleware

    // 1. Check if delivery man is already busy
    const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
    const deliveryMan = await DeliveryManModel.findById(deliveryManId);

    if (!deliveryMan) {
      return res.status(404).json({ message: "Delivery man not found" });
    }

    if (deliveryMan.status === "busy") {
      return res.status(400).json({ message: "You already have an active delivery" });
    }

    // 2. Update Delivery Man status
    deliveryMan.status = "busy";
    deliveryMan.currentOrderId = orderId;
    await deliveryMan.save();

    // 3. Update Order
    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        status: "onTheWay",
        deliveryManId: deliveryManId,
        $push: {
          timeline: {
            status: "onTheWay",
            timestamp: new Date(),
            note: `Order picked up by ${deliveryMan.name || "delivery partner"}`
          }
        }
      },
      { new: true }
    ).populate("userId", "firstName lastName phone");

    if (!order) {
      // Rollback delivery man status if order not found
      deliveryMan.status = "available";
      deliveryMan.currentOrderId = null;
      await deliveryMan.save();
      return res.status(404).json({ message: "Order not found" });
    }

    // Socket.IO notification
    const io = req.app?.get?.("io");
    if (io) {
      io.to(`order-${orderId}`).emit("status-update", {
        orderId,
        status: "onTheWay",
        deliveryMan: {
          name: deliveryMan.name,
          phone: deliveryMan.phone,
          vehicleType: deliveryMan.vehicleType,
          rating: deliveryMan.rating
        },
        timestamp: new Date()
      });
      io.emit("delivery-status-changed", { orderId, status: "onTheWay", deliveryManId });
    }

    // In-app notifications for Customer, Driver, and Admin
    try {
      sendInAppNotification({
        userId: order.userId?._id || order.userId,
        title: "🛵 Courier On The Way!",
        message: `${deliveryMan.name || "A courier"} accepted Order #${orderId.slice(-6)} and is on the way to you!`,
        type: "delivery",
        orderId: order._id,
        link: `/orders/${order._id}`,
        icon: "🛵",
        io
      }).catch(() => {});

      sendInAppNotification({
        userId: deliveryManId,
        title: "🚀 Delivery Started",
        message: `You accepted Order #${orderId.slice(-6)}. Navigate safely to customer address!`,
        type: "delivery",
        orderId: order._id,
        link: "/delivery",
        icon: "🚚",
        io
      }).catch(() => {});

      notifyAdmins({
        title: "🛵 Order Picked Up",
        message: `Order #${orderId.slice(-6)} picked up by ${deliveryMan.name || "courier"}.`,
        type: "delivery",
        orderId: order._id,
        link: "/admin?tab=orders",
        icon: "🛵",
        io
      }).catch(() => {});
    } catch (e) {}

    res.status(200).json({ message: "Order accepted", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delivery man marks order as delivered
export const markAsDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const deliveryManId = req.user.id;

    // 1. Find the order and verify it belongs to this delivery man
    const order = await OrderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.deliveryManId?.toString() !== deliveryManId) {
      return res.status(403).json({ message: "This order is not assigned to you" });
    }

    // 2. Update Order Status
    order.status = "delivered";
    if (order.payment) {
      order.payment.status = "Paid";
    }
    if (!Array.isArray(order.timeline)) {
      order.timeline = [];
    }
    order.timeline.push({
      status: "delivered",
      timestamp: new Date(),
      note: "Order successfully delivered to customer"
    });
    await order.save();

    // 3. Update Delivery Man Status & Stats
    const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
    await DeliveryManModel.findByIdAndUpdate(deliveryManId, {
      status: "available",
      currentOrderId: null,
      $inc: { totalDeliveries: 1 }
    });

    // Socket.IO notification
    const io = req.app?.get?.("io");
    if (io) {
      io.to(`order-${orderId}`).emit("status-update", {
        orderId,
        status: "delivered",
        timestamp: new Date()
      });
      io.emit("delivery-completed", { orderId, deliveryManId });
    }

    // In-app notifications for Customer, Driver, and Admin
    try {
      sendInAppNotification({
        userId: order.userId?._id || order.userId,
        title: "🎉 Order Delivered!",
        message: `Your order #${orderId.slice(-6)} has arrived safely. Enjoy your meal!`,
        type: "order_status",
        orderId: order._id,
        link: `/orders/${order._id}`,
        icon: "🎉",
        io
      }).catch(() => {});

      sendInAppNotification({
        userId: deliveryManId,
        title: "🎉 Delivery Completed!",
        message: `Awesome work! Order #${orderId.slice(-6)} completed. +1 delivery added to your record.`,
        type: "delivery",
        orderId: order._id,
        link: "/delivery",
        icon: "✅",
        io
      }).catch(() => {});

      notifyAdmins({
        title: "✅ Order Successfully Delivered",
        message: `Order #${orderId.slice(-6)} was completed and marked as delivered.`,
        type: "delivery",
        orderId: order._id,
        link: "/admin?tab=orders",
        icon: "✅",
        io
      }).catch(() => {});
    } catch (e) {}

    res.status(200).json({ message: "Order marked as delivered", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all delivery men
export const getAllDeliveryMen = async (req, res) => {
  try {
    const men = await DeliveryManModel.find().select("-password -confirmPassword");
    res.status(200).json(men);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update delivery man account (Admin only)
export const updateDeliveryMan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, status, vehicleType } = req.body;

    const updates = { name, phone, email, status };
    if (vehicleType) updates.vehicleType = vehicleType;

    const updated = await DeliveryManModel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select("-password -confirmPassword");

    if (!updated) {
      return res.status(404).json({ message: "Delivery man not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete delivery man account (Admin only)
export const deleteDeliveryMan = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DeliveryManModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Delivery man not found" });
    }

    res.status(200).json({ message: "Delivery man deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get delivery man's active order
export const getMyActiveOrder = async (req, res) => {
  try {
    const deliveryManId = req.user.id;

    // Find order that is assigned to this delivery man and is "onTheWay" or "Preparing"
    const order = await OrderModel.findOne({
      deliveryManId: deliveryManId,
      status: { $in: ["onTheWay", "Preparing"] }
    }).populate("userId", "firstName lastName phone address");

    res.status(200).json(order || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get delivery man's past completed deliveries
export const getMyDeliveryHistory = async (req, res) => {
  try {
    const deliveryManId = req.user.id;
    const orders = await OrderModel.find({
      deliveryManId: deliveryManId,
      status: "delivered"
    })
      .populate("userId", "firstName lastName phone")
      .sort({ updatedAt: -1 })
      .limit(50);

    const totalEarned = orders.reduce((sum, order) => sum + (order.deliveryFee || 3.99), 0);

    res.status(200).json({
      orders,
      totalCompleted: orders.length,
      totalEarned: Math.round(totalEarned * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Assign an available delivery man to an order
export const assignDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryManId: selectedId } = req.body;

    // 1. Find delivery man (either specified by Admin or first available)
    let deliveryMan;
    if (selectedId) {
      deliveryMan = await DeliveryManModel.findById(selectedId);
    } else {
      deliveryMan = await DeliveryManModel.findOne({ status: "available" });
    }

    if (!deliveryMan) {
      return res.status(404).json({ message: "No available delivery men at the moment." });
    }

    // 2. Update Delivery Man
    deliveryMan.status = "busy";
    deliveryMan.currentOrderId = orderId;
    await deliveryMan.save();

    // 3. Update Order
    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        status: "onTheWay",
        deliveryManId: deliveryMan._id,
        $push: {
          timeline: {
            status: "onTheWay",
            timestamp: new Date(),
            note: `Assigned to ${deliveryMan.name}`
          }
        }
      },
      { new: true }
    ).populate("userId", "firstName lastName phone");

    // Socket.IO notification
    const io = req.app?.get?.("io");
    if (io) {
      io.to(`order-${orderId}`).emit("status-update", {
        orderId,
        status: "onTheWay",
        deliveryMan: {
          name: deliveryMan.name,
          phone: deliveryMan.phone,
          vehicleType: deliveryMan.vehicleType
        },
        timestamp: new Date()
      });
      io.emit("delivery-assigned", { orderId, deliveryManId: deliveryMan._id });
    }

    // Notifications for Customer, Driver, and Admin
    try {
      sendInAppNotification({
        userId: order.userId?._id || order.userId,
        title: "🛵 Courier Assigned!",
        message: `${deliveryMan.name} has been assigned to deliver Order #${orderId.slice(-6)}.`,
        type: "delivery",
        orderId: order._id,
        link: `/orders/${order._id}`,
        icon: "🛵",
        io
      }).catch(() => {});

      sendInAppNotification({
        userId: deliveryMan._id,
        title: "📦 New Delivery Assigned",
        message: `You have been assigned Order #${orderId.slice(-6)}. Address: ${order.deliveryAddress || "Addis Ababa"}`,
        type: "delivery",
        orderId: order._id,
        link: "/delivery",
        icon: "📦",
        io
      }).catch(() => {});

      notifyAdmins({
        title: "🛵 Driver Assigned",
        message: `${deliveryMan.name} assigned to Order #${orderId.slice(-6)}.`,
        type: "delivery",
        orderId: order._id,
        link: "/admin?tab=orders",
        icon: "🛵",
        io
      }).catch(() => {});
    } catch (e) {}

    res.status(200).json({ message: "Delivery assigned", order, deliveryMan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark delivery as complete (Admin or System)
export const completeDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Find the order to get the delivery man ID
    const order = await OrderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 2. Update Order Status
    order.status = "delivered";
    if (order.payment) {
      order.payment.status = "Paid";
    }
    if (!Array.isArray(order.timeline)) {
      order.timeline = [];
    }
    order.timeline.push({
      status: "delivered",
      timestamp: new Date(),
      note: "Order marked delivered"
    });
    await order.save();

    // 3. Update Delivery Man Status
    if (order.deliveryManId) {
      await DeliveryManModel.findByIdAndUpdate(order.deliveryManId, {
        status: "available",
        currentOrderId: null,
        $inc: { totalDeliveries: 1 }
      });
    }

    const io = req.app?.get?.("io");
    if (io) {
      io.to(`order-${orderId}`).emit("status-update", {
        orderId,
        status: "delivered",
        timestamp: new Date()
      });
      io.emit("delivery-completed", { orderId, deliveryManId: order.deliveryManId });
    }

    // Notifications for Customer, Driver, and Admin
    try {
      sendInAppNotification({
        userId: order.userId?._id || order.userId,
        title: "🎉 Order Delivered!",
        message: `Your order #${orderId.slice(-6)} has arrived. Enjoy your meal!`,
        type: "order_status",
        orderId: order._id,
        link: `/orders/${order._id}`,
        icon: "🎉",
        io
      }).catch(() => {});

      if (order.deliveryManId) {
        sendInAppNotification({
          userId: order.deliveryManId,
          title: "🎉 Delivery Completed!",
          message: `Order #${orderId.slice(-6)} completed. +1 delivery recorded.`,
          type: "delivery",
          orderId: order._id,
          link: "/delivery",
          icon: "✅",
          io
        }).catch(() => {});
      }

      notifyAdmins({
        title: "✅ Order Marked as Delivered",
        message: `Order #${orderId.slice(-6)} was completed.`,
        type: "delivery",
        orderId: order._id,
        link: "/admin?tab=orders",
        icon: "✅",
        io
      }).catch(() => {});
    } catch (e) {}

    res.status(200).json({ message: "Order delivered successfully", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
