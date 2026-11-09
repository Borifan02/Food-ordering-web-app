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
