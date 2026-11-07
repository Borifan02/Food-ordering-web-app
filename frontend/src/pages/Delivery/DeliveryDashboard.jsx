import { useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import { getSocket } from "../../utils/socket";
import UserProfileManager from "../../components/Profile/UserProfileManager";
import apiClient from "../../api/axios";
import "./DeliveryDashboard.css";

const DeliveryDashboard = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "active");
  const [driverStatus, setDriverStatus] = useState("available"); // "available", "busy", "offline"
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      const role = (user.role || "").trim().toLowerCase();
      if (role !== "deliveryman") {
        navigate("/menu");
      } else {
        fetchPendingOrders();
        fetchActiveDelivery();
        fetchHistory();

        // Socket.IO real-time listener for delivery drivers
        const socket = getSocket();
        if (socket) {
          socket.emit("join-delivery");

          socket.on("delivery-assigned", (data) => {
            if (data.deliveryManId === user._id) {
              toast.info("🚨 New delivery assigned to you!");
              fetchActiveDelivery();
            }
          });

          socket.on("new-order", () => {
            fetchPendingOrders();
          });
        }

        return () => {
          if (socket) {
            socket.off("delivery-assigned");
            socket.off("new-order");
          }
        };
      }
    }
  }, [user, navigate]);

  const fetchPendingOrders = async () => {
    try {
      const res = await apiClient.get("/delivery/pending-orders");
      setPendingOrders(res.data || []);
    } catch (err) {
      console.error("Error fetching pending orders:", err);
    }
  };

  const fetchActiveDelivery = async () => {
    try {
      const res = await apiClient.get("/delivery/my-active-order");
      setActiveDelivery(res.data || null);
    } catch (err) {
      console.error("Error fetching active delivery:", err);
      setActiveDelivery(null);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get("/delivery/history");
      setDeliveryHistory(res.data.orders || []);
    } catch (err) {
      console.error("Error fetching delivery history:", err);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    if (activeDelivery) {
      toast.warning("You already have an active delivery in progress!");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/delivery/accept/${orderId}`);
      toast.success("Order accepted! Head to the restaurant kitchen for pickup. 🛵");
      await fetchPendingOrders();
      await fetchActiveDelivery();
      setActiveTab("active");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept order");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    setLoading(true);
    try {
      await apiClient.post(`/delivery/mark-delivered/${orderId}`);
      toast.success("Great job! Order marked as successfully delivered. 🎉");
      setActiveDelivery(null);
      await fetchPendingOrders();
      await fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete delivery");
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = deliveryHistory.reduce(
    (sum, o) => sum + (o.deliveryFee || 3.99),
    0
  );

  return (
    <div className="delivery-container">
      {/* Top Header Card */}
      <div className="delivery-header-card">
        <div className="driver-profile-info">
          <div className="driver-avatar-circle">🛵</div>
          <div>
            <h1>{t("deliveryHub")}</h1>
            <p className="welcome-text">
              {t("welcomeBack")}, <strong>{user?.name || user?.firstName}</strong>!
            </p>
          </div>
        </div>

        {/* Status Toggle Button */}
        <div className="driver-status-toggle">
          <button
            className={`status-toggle-btn ${driverStatus === "available" ? "active-available" : ""}`}
            onClick={() => {
              setDriverStatus("available");
              toast.success("You are now ONLINE and ready for orders!");
            }}
          >
            {t("driverStatusAvailable")}
          </button>
          <button
            className={`status-toggle-btn ${driverStatus === "offline" ? "active-break" : ""}`}
            onClick={() => {
              setDriverStatus("offline");
              toast.info("You are now ON BREAK / Offline");
            }}
          >
            ☕ {t("onBreak")}
          </button>
        </div>
      </div>

      {/* Driver Performance Metrics Bar */}
      <div className="delivery-stats-bar">
        <div className="d-stat-box">
          <span className="d-stat-label">{t("deliveriesCompleted")}</span>
          <span className="d-stat-val">{deliveryHistory.length}</span>
        </div>
        <div className="d-stat-box">
          <span className="d-stat-label">{t("deliveryEarnings")}</span>
          <span className="d-stat-val text-green">{totalEarnings.toFixed(2)} ETB</span>
        </div>
        <div className="d-stat-box">
          <span className="d-stat-label">{t("driverRating")}</span>
          <span className="d-stat-val">★ 4.95</span>
        </div>
        <div className="d-stat-box">
          <span className="d-stat-label">{t("vehicleType")}</span>
          <span className="d-stat-val">{t("scooter")}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="delivery-tabs-bar">
        <button
          className={`d-tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          {t("activeDeliveriesTab")} {activeDelivery && <span className="tab-dot"></span>}
        </button>
        <button
          className={`d-tab-btn ${activeTab === "available" ? "active" : ""}`}
          onClick={() => setActiveTab("available")}
        >
          {t("availablePickupsTab")} ({pendingOrders.length})
        </button>
        <button
          className={`d-tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          {t("deliveryHistoryTab")} ({deliveryHistory.length})
        </button>
        <button
          className={`d-tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          👤 {t("profileAndSecurity")}
        </button>
      </div>

      {/* ACTIVE DELIVERY TAB */}
      {activeTab === "active" && (
        <div className="active-delivery-view">
          {activeDelivery ? (
            <div className="order-card active-delivery-card">
              <div className="order-header">
                <span className="order-id">
                  {t("orderId")} #{activeDelivery._id.substring(0, 8)}
                </span>
                <span className="order-status status-ontheway">
                  🛵 {t("outForDelivery")}
                </span>
              </div>

              <div className="order-customer-box">
                <div className="customer-info-line">
                  <span className="info-icon">👤</span>
                  <div>
                    <strong className="customer-name">
                      {activeDelivery.userId?.firstName} {activeDelivery.userId?.lastName}
                    </strong>
                    <div className="customer-phone">
                      {activeDelivery.userId?.phone}
                    </div>
                  </div>
                  {activeDelivery.userId?.phone && (
                    <a
                      href={`tel:${activeDelivery.userId?.phone}`}
                      className="call-customer-btn"
                    >
                      {t("callCustomer")}
                    </a>
                  )}
                </div>

                <div className="customer-info-line">
                  <span className="info-icon">📍</span>
                  <div>
                    <strong>{t("dropoffLocation")}:</strong>
                    <div className="delivery-address-text">
                      {activeDelivery.deliveryAddress}
                    </div>
                  </div>
                </div>

                {activeDelivery.orderNotes && (
                  <div className="customer-info-line notes-highlight">
                    <span className="info-icon">📝</span>
                    <div>
                      <strong>{t("customerInstructions")}:</strong>
                      <div>"{activeDelivery.orderNotes}"</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="order-items-preview-box">
                <strong>{t("orderItemsToDeliver")}:</strong>
                <ul>
                  {activeDelivery.items?.map((item, idx) => (
                    <li key={idx}>
                      {item.quantity}x {item.name} - {(item.price * item.quantity).toFixed(2)} ETB
                    </li>
                  ))}
                </ul>
                <div className="order-total-preview">
                  <span>{t("paymentMethod")}: {activeDelivery.payment?.method || "Cash"}</span>
                  <span className="order-total-badge">
                    {t("totalToCollect")}: {Number(activeDelivery.totalAmount).toFixed(2)} ETB
                  </span>
                </div>
              </div>

              <button
                className="btn-mark-delivered"
                onClick={() => handleMarkDelivered(activeDelivery._id)}
                disabled={loading}
              >
                {loading ? "..." : `✓ ${t("confirmDelivered")}`}
              </button>
            </div>
          ) : (
            <div className="no-active-delivery-card">
              <div className="no-active-icon">🛵</div>
              <h3>{t("noActiveDeliveryTitle")}</h3>
              <p>{t("noActiveDeliveries")}</p>
              <button
                className="check-available-btn"
                onClick={() => setActiveTab("available")}
              >
                {t("checkOrdersReady")} ({pendingOrders.length}) ➔
              </button>
            </div>
          )}
        </div>
      )}

      {/* ORDERS READY FOR PICKUP TAB */}
      {activeTab === "available" && (
        <div className="available-orders-view">
          {pendingOrders.length === 0 ? (
            <div className="no-orders-box">
              <span className="no-orders-icon">☕</span>
              <h3>{t("noOrdersWaiting")}</h3>
              <p>{t("noAvailablePickups")}</p>
            </div>
          ) : (
            <div className="orders-grid">
              {pendingOrders.map((order) => (
                <div key={order._id} className="order-card ready-pickup-card">
                  <div className="order-header">
                    <span className="order-id">
                      {t("orderId")} #{order._id.substring(0, 8)}
                    </span>
                    <span className="order-status status-preparing">
                      {t("readyForPickup")}
                    </span>
                  </div>

                  <div className="pickup-details">
                    <p>
                      <strong>{t("customer")}:</strong> {order.userId?.firstName} {order.userId?.lastName}
                    </p>
                    <p>
                      <strong>{t("dropoffLocation")}:</strong> {order.deliveryAddress}
                    </p>
                    <p>
                      <strong>{t("totalAmount")}:</strong> {Number(order.totalAmount).toFixed(2)} ETB ({order.payment?.method || "Cash"})
                    </p>
                    <div className="pickup-items-snippet">
                      <strong>{t("orderItems")} ({order.items?.length}):</strong>
                      <ul>
                        {order.items?.map((item, idx) => (
                          <li key={idx}>
                            {item.quantity}x {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    className="btn-accept-order"
                    onClick={() => handleAcceptOrder(order._id)}
                    disabled={loading || !!activeDelivery}
                  >
                    {activeDelivery ? "Busy with Active Order" : `${t("acceptDeliveryBtn")}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAST DELIVERIES HISTORY TAB */}
      {activeTab === "history" && (
        <div className="history-tab-view">
          {deliveryHistory.length === 0 ? (
            <div className="no-orders-box">
              <p>{t("noOrdersWaiting")}</p>
            </div>
          ) : (
            <div className="history-table-box">
              <table className="delivery-history-table">
                <thead>
                  <tr>
                    <th>{t("orderId")}</th>
                    <th>{t("customer")}</th>
                    <th>{t("dropoffLocation")}</th>
                    <th>{t("deliveredDate")}</th>
                    <th>{t("earnedFee")}</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryHistory.map((d) => (
                    <tr key={d._id}>
                      <td>#{d._id.substring(0, 8)}</td>
                      <td>{d.userId?.firstName || "Customer"}</td>
                      <td>{d.deliveryAddress}</td>
                      <td>
                        {new Date(d.updatedAt || d.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <span className="earned-badge">
                          +{Number(d.deliveryFee || 3.99).toFixed(2)} ETB
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PROFILE & SECURITY TAB */}
      {activeTab === "profile" && (
        <div className="delivery-profile-view">
          <UserProfileManager />
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
