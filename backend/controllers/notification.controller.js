import { NotificationModel } from "../models/notification.model.js";
import logger from "../utils/logger.js";

/**
 * Helper to dispatch in-app notifications and broadcast via WebSocket
 */
export const sendInAppNotification = async ({
  userId,
  title,
  message,
  type = "system",
  orderId = null,
  link = "",
  icon = "🔔",
  io = null,
}) => {
  try {
    if (!userId) return null;
    const notification = await NotificationModel.create({
      userId,
      title,
      message,
      type,
      orderId,
      link,
      icon,
    });

    if (io) {
      io.to(`user-${userId}`).emit("new-notification", notification);
      io.emit("notification-broadcast", { userId, notification });
    }
    return notification;
  } catch (error) {
    logger.error("Error creating in-app notification:", error);
    return null;
  }
};

/**
 * Broadcast notifications to all users of a specific role (e.g. 'admin', 'deliveryMan')
 */
export const notifyUsersByRole = async (
  role,
  {
    title,
    message,
    type = "system",
    orderId = null,
    link = "",
    icon = "🔔",
    io = null,
  }
) => {
  try {
    const normalizedRole = (role || "").trim().toLowerCase();
    let targetUserIds = [];

    if (normalizedRole === "admin") {
      try {
        const { userModel } = await import("../models/user.model.js");
        if (typeof userModel?.find === "function") {
          const admins = await userModel.find({ role: "admin" }).select("_id").lean();
          targetUserIds = admins.map((a) => a._id);
        }
      } catch (err) {
        logger.error("Error finding admin users for notification:", err);
      }
    } else if (normalizedRole === "deliveryman" || normalizedRole === "delivery") {
      try {
        const { DeliveryManModel } = await import("../models/deliveryMan.model.js");
        const { userModel } = await import("../models/user.model.js");
        const promises = [];
        if (typeof DeliveryManModel?.find === "function") {
          promises.push(DeliveryManModel.find({}).select("_id").lean());
        }
        if (typeof userModel?.find === "function") {
          promises.push(userModel.find({ role: "deliveryMan" }).select("_id").lean());
        }
        const results = await Promise.all(promises);
        const set = new Set();
        results.flat().forEach((doc) => {
          if (doc?._id) set.add(doc._id.toString());
        });
        targetUserIds = Array.from(set);
      } catch (err) {
        logger.error("Error finding delivery couriers for notification:", err);
      }
    }

    const createdNotifications = [];
    for (const uId of targetUserIds) {
      try {
        const notification = await NotificationModel.create({
          userId: uId,
          title,
          message,
          type,
          orderId,
          link,
          icon,
        });
        createdNotifications.push(notification);

        if (io) {
          io.to(`user-${uId}`).emit("new-notification", notification);
        }
      } catch (e) {
        // Continue creating for other users
      }
    }

    // Role-wide WebSocket Channel Broadcasts
    if (io) {
      const broadcastPayload = {
        title,
        message,
        type,
        orderId,
        link,
        icon,
        createdAt: new Date(),
      };
      if (normalizedRole === "admin") {
        io.to("admin-channel").emit("new-notification", broadcastPayload);
      } else if (normalizedRole === "deliveryman" || normalizedRole === "delivery") {
        io.to("delivery-channel").emit("new-notification", broadcastPayload);
      }
    }

    return createdNotifications;
  } catch (error) {
    logger.error(`Error broadcasting notification to role ${role}:`, error);
    return [];
  }
};

/**
 * Convenient shortcut to notify all restaurant administrators
 */
export const notifyAdmins = async ({
  title,
  message,
  type = "system",
  orderId = null,
  link = "/admin",
  icon = "👑",
  io = null,
}) => {
  return notifyUsersByRole("admin", {
    title,
    message,
    type,
    orderId,
    link,
    icon,
    io,
  });
};

/**
 * Convenient shortcut to notify all active delivery couriers
 */
export const notifyDeliveryDrivers = async ({
  title,
  message,
  type = "delivery",
  orderId = null,
  link = "/delivery",
  icon = "🛵",
  io = null,
}) => {
  return notifyUsersByRole("deliveryMan", {
    title,
    message,
    type,
    orderId,
    link,
    icon,
    io,
  });
};

/**
 * GET /api/notifications
 * Get authenticated user's notifications + unread count
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const limit = Math.min(Number(req.query.limit) || 30, 50);

    const [notifications, unreadCount] = await Promise.all([
      NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({ userId, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await NotificationModel.countDocuments({ userId, isRead: false });

    res.status(200).json({
      success: true,
      notification,
      unreadCount,
    });
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to update notification", error: error.message });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all user's notifications as read
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    await NotificationModel.updateMany({ userId, isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Failed to mark all as read", error: error.message });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const notification = await NotificationModel.findOneAndDelete({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await NotificationModel.countDocuments({ userId, isRead: false });

    res.status(200).json({
      success: true,
      message: "Notification deleted",
      unreadCount,
    });
  } catch (error) {
    logger.error("Error deleting notification:", error);
    res.status(500).json({ message: "Failed to delete notification", error: error.message });
  }
};

