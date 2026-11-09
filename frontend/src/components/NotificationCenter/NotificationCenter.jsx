import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import { getSocket } from "../../utils/socket";
import "./NotificationCenter.css";

const NotificationCenter = () => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const userId = user?._id || user?.id;

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await apiClient.get("/notifications?limit=25");
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Could not fetch notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  // Connect socket for real-time notifications
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    socket.emit("join-user", userId);

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast.info(`🔔 ${notif.title}: ${notif.message}`);
    };

    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, [userId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await apiClient.patch(`/notifications/${id}/read`);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(res.data.unreadCount ?? Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.warn("Error marking notification read:", err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await apiClient.patch("/notifications/read-all");
      if (res.data?.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success(t("markAllAsRead") || "All marked as read");
      }
    } catch (err) {
      console.warn("Error marking all read:", err.message);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif._id);
    }
    setIsOpen(false);

    if (notif.link) {
      navigate(notif.link);
    } else if (notif.orderId) {
      navigate(`/orders/${notif.orderId}`);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!user) return null;

  return (
    <div className="notification-center-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        title={t("notifications") || "Notifications"}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge-pill" aria-live="polite">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-panel animate-pop-in">
          {/* Header */}
          <div className="notif-dropdown-header">
            <div className="notif-header-title">
              <span className="notif-header-icon">🔔</span>
              <h3>{t("notifications") || "Notifications"}</h3>
              {unreadCount > 0 && (
                <span className="notif-counter-tag">{unreadCount} new</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
              >
                {t("markAllAsRead") || "Mark all read"}
              </button>
            )}
          </div>

          {/* List */}
          <div className="notif-dropdown-body">
            {loading && notifications.length === 0 ? (
              <div className="notif-empty-state">
                <span className="empty-spinner">⏳</span>
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty-state">
                <span className="empty-bell-icon">🔕</span>
                <p>{t("noNotifications") || "No new notifications right now."}</p>
                <small>Updates regarding your orders and deliveries will appear here.</small>
              </div>
            ) : (
              <div className="notif-items-list">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`notif-item-row ${notif.isRead ? "read" : "unread"}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notif-type-icon">{notif.icon || "🔔"}</div>

                    <div className="notif-content-col">
                      <div className="notif-title-row">
                        <strong className="notif-item-title">{notif.title}</strong>
                        {!notif.isRead && <span className="unread-dot"></span>}
                      </div>
                      <p className="notif-item-msg">{notif.message}</p>
                      <span className="notif-time-ago">{formatTimeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
