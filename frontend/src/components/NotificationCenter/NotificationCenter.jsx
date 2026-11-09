import { useState, useEffect, useRef, useContext, useMemo } from "react";
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
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'orders' | 'payments' | 'deliveries'
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("foodie_sound_enabled");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const dropdownRef = useRef(null);

  const userId = user?._id || user?.id;
  const role = (user?.role || "").trim().toLowerCase();

  const toggleSound = (e) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("foodie_sound_enabled", JSON.stringify(next));
    } catch {}
    toast.info(next ? (t("soundOn") || "Sound on 🔊") : (t("soundOff") || "Sound muted 🔇"));
  };

  // Synthesized Web Audio chime (safe across browsers)
  const playNotificationChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy until user gesture
    }
  };

  // Fetch initial notifications from database
  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await apiClient.get("/notifications?limit=30");
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

  // Connect socket rooms for real-time notifications for ALL user roles
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket) return;

    // 1. Join personal user room
    socket.emit("join-user", userId);

    // 2. Join role-specific channels
    if (role === "admin") {
      socket.emit("join-admin");
    } else if (role === "deliveryman" || role === "delivery") {
      socket.emit("join-delivery");
    }

    const handleNewNotification = (notif) => {
      if (!notif) return;
      // Deduplicate in case message received from both channel & direct room
      setNotifications((prev) => {
        if (notif._id && prev.some((n) => n._id === notif._id)) {
          return prev;
        }
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);

      playNotificationChime();
      toast.info(`${notif.icon || "🔔"} ${notif.title}: ${notif.message}`);
    };

    socket.on("new-notification", handleNewNotification);

    return () => {
      socket.off("new-notification", handleNewNotification);
    };
  }, [userId, role, soundEnabled]);

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

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await apiClient.delete(`/notifications/${id}`);
      if (res.data?.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setUnreadCount(res.data.unreadCount ?? unreadCount);
      }
    } catch (err) {
      console.warn("Error deleting notification:", err.message);
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

  // Role-aware navigation on click
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead && notif._id) {
      await handleMarkAsRead(notif._id);
    }
    setIsOpen(false);

    if (notif.link) {
      navigate(notif.link);
      return;
    }

    if (notif.orderId) {
      if (role === "admin") {
        navigate(`/admin?tab=orders&orderId=${notif.orderId}`);
      } else if (role === "deliveryman" || role === "delivery") {
        navigate("/delivery");
      } else {
        navigate(`/orders/${notif.orderId}`);
      }
      return;
    }

    if (role === "admin") navigate("/admin");
    else if (role === "deliveryman" || role === "delivery") navigate("/delivery");
    else navigate("/customer");
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

  // Category filter
  const filteredNotifications = useMemo(() => {
    if (activeTab === "orders") {
      return notifications.filter(
        (n) => n.type === "order_placed" || n.type === "order_status"
      );
    }
    if (activeTab === "payments") {
      return notifications.filter((n) => n.type === "payment");
    }
    if (activeTab === "deliveries") {
      return notifications.filter((n) => n.type === "delivery");
    }
    return notifications;
  }, [notifications, activeTab]);

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

            <div className="notif-header-actions">
              <button
                type="button"
                className={`notif-sound-btn ${soundEnabled ? "on" : "muted"}`}
                onClick={toggleSound}
                title={soundEnabled ? "Sound enabled (Click to mute)" : "Sound muted (Click to enable)"}
                aria-label="Toggle notification sound"
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>

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
          </div>

          {/* Filter Pills */}
          <div className="notif-tabs-bar">
            <button
              type="button"
              className={`notif-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              {t("notifAll") || "All"} ({notifications.length})
            </button>
            <button
              type="button"
              className={`notif-tab-btn ${activeTab === "orders" ? "active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              🍕 {t("notifOrders") || "Orders"}
            </button>
            <button
              type="button"
              className={`notif-tab-btn ${activeTab === "payments" ? "active" : ""}`}
              onClick={() => setActiveTab("payments")}
            >
              💳 {t("notifPayments") || "Payments"}
            </button>
            <button
              type="button"
              className={`notif-tab-btn ${activeTab === "deliveries" ? "active" : ""}`}
              onClick={() => setActiveTab("deliveries")}
            >
              🛵 {t("notifDeliveries") || "Deliveries"}
            </button>
          </div>

          {/* List */}
          <div className="notif-dropdown-body">
            {loading && notifications.length === 0 ? (
              <div className="notif-empty-state">
                <span className="empty-spinner">⏳</span>
                <p>Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <span className="empty-bell-icon">🔕</span>
                <p>{t("noNotifications") || "No new notifications right now."}</p>
                <small>Real-time updates regarding orders, payments, and deliveries appear here.</small>
              </div>
            ) : (
              <div className="notif-items-list">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`notif-item-row ${notif.isRead ? "read" : "unread"}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notif-type-icon">{notif.icon || "🔔"}</div>

                    <div className="notif-content-col">
                      <div className="notif-title-row">
                        <strong className="notif-item-title">{notif.title}</strong>
                        {!notif.isRead && <span className="unread-dot" title="Unread"></span>}
                      </div>
                      <p className="notif-item-msg">{notif.message}</p>
                      <div className="notif-meta-row">
                        <span className="notif-time-ago">{formatTimeAgo(notif.createdAt)}</span>
                        {notif.type && (
                          <span className={`notif-category-chip type-${notif.type}`}>
                            {notif.type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="notif-delete-btn"
                      onClick={(e) => handleDeleteNotification(notif._id, e)}
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      ✕
                    </button>
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
