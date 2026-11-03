import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getSocket } from "../../utils/socket";
import apiClient from "../../api/axios";
import "./DeliveryDashboard.css";

const DeliveryDashboard = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("active"); // "active", "available", "history"
  const [driverStatus, setDriverStatus] = useState("available"); // "available", "busy", "offline"
  const [loading, setLoading] = useState(false);

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
            <h1>Delivery Partner Hub</h1>
            <p className="welcome-text">
              Welcome back, <strong>{user?.name || user?.firstName}</strong>!
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
            🟢 Available for Orders
          </button>
          <button
            className={`status-toggle-btn ${driverStatus === "offline" ? "active-break" : ""}`}
            onClick={() => {
              setDriverStatus("offline");
              toast.info("You are now ON BREAK / Offline");
            }}
          >
            ☕ On Break
          </button>
        </div>
      </div>

      {/* Driver Performance Metrics Bar */}
      <div className="delivery-stats-bar">
        <div className="d-stat-box">
          <span className="d-stat-label">Deliveries Completed</span>
          <span className="d-stat-val">{deliveryHistory.length}</span>
        </div>
        <div className="d-stat-box">
          <span className="d-stat-label">Delivery Earnings</span>
          <span className="d-stat-val text-green">${totalEarnings.toFixed(2)}</span>
        </div>
        <div className="d-stat-box">
          <span className="d-stat-label">Driver Rating</span>
          <span className="d-stat-val">★ 4.95</span>
        </div>
        <div className="d-stat-box">
          <span className="d-stat-label">Vehicle</span>
          <span className="d-stat-val">Scooter</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="delivery-tabs-bar">
        <button
          className={`d-tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          🛵 Active Delivery {activeDelivery && <span className="tab-dot"></span>}
        </button>
        <button
          className={`d-tab-btn ${activeTab === "available" ? "active" : ""}`}
          onClick={() => setActiveTab("available")}
        >
          📦 Ready for Pickup ({pendingOrders.length})
        </button>
        <button
          className={`d-tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📜 Past Deliveries ({deliveryHistory.length})
        </button>
      </div>

      {/* ACTIVE DELIVERY TAB */}
      {activeTab === "active" && (
        <div className="active-delivery-view">
          {activeDelivery ? (
            <div className="order-card active-delivery-card">
              <div className="order-header">
                <span className="order-id">
                  Order #{activeDelivery._id.substring(0, 8)}
                </span>
                <span className="order-status status-ontheway">
                  🛵 Out for Delivery
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
                      📞 Call Customer
                    </a>
                  )}
                </div>

                <div className="customer-info-line">
                  <span className="info-icon">📍</span>
                  <div>
                    <strong>Drop-off Address:</strong>
                    <div className="delivery-address-text">
                      {activeDelivery.deliveryAddress}
                    </div>
                  </div>
                </div>

                {activeDelivery.orderNotes && (
                  <div className="customer-info-line notes-highlight">
                    <span className="info-icon">📝</span>
                    <div>
                      <strong>Customer Instructions:</strong>
                      <div>"{activeDelivery.orderNotes}"</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="order-items-preview-box">
                <strong>Items to Deliver:</strong>
                <ul>
                  {activeDelivery.items?.map((item, idx) => (
                    <li key={idx}>
                      {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                    </li>
                  ))}
                </ul>
                <div className="order-total-preview">
                  <span>Payment Method: {activeDelivery.payment?.method || "Cash"}</span>
                  <span className="order-total-badge">
                    Total to Collect: ${Number(activeDelivery.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                className="btn-mark-delivered"
                onClick={() => handleMarkDelivered(activeDelivery._id)}
                disabled={loading}
              >
                {loading ? "Processing..." : "✓ Confirm Order Delivered"}
              </button>
            </div>
          ) : (
            <div className="no-active-delivery-card">
              <div className="no-active-icon">🛵</div>
              <h3>No Active Delivery Right Now</h3>
              <p>You have no delivery currently in progress.</p>
              <button
                className="check-available-btn"
                onClick={() => setActiveTab("available")}
              >
                Check Orders Ready for Pickup ({pendingOrders.length}) ➔
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
              <h3>No orders currently waiting for pickup</h3>
              <p>New orders will appear here in real-time as the kitchen prepares them.</p>
            </div>
          ) : (
            <div className="orders-grid">
              {pendingOrders.map((order) => (
                <div key={order._id} className="order-card ready-pickup-card">
                  <div className="order-header">
                    <span className="order-id">
                      Order #{order._id.substring(0, 8)}
                    </span>
                    <span className="order-status status-preparing">
                      Ready for Pickup
                    </span>
                  </div>

                  <div className="pickup-details">
                    <p>
                      <strong>Customer:</strong> {order.userId?.firstName} {order.userId?.lastName}
                    </p>
                    <p>
                      <strong>Drop-off:</strong> {order.deliveryAddress}
                    </p>
                    <p>
                      <strong>Order Total:</strong> ${Number(order.totalAmount).toFixed(2)} ({order.payment?.method || "Cash"})
                    </p>
                    <div className="pickup-items-snippet">
                      <strong>Items ({order.items?.length}):</strong>
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
                    {activeDelivery ? "Busy with Active Order" : "Accept Delivery ➔"}
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
              <p>No completed deliveries recorded yet.</p>
            </div>
          ) : (
            <div className="history-table-box">
              <table className="delivery-history-table">
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Customer</th>
                    <th>Drop-off Address</th>
                    <th>Delivered Date</th>
                    <th>Earned Fee</th>
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
                          +${(d.deliveryFee || 3.99).toFixed(2)}
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
    </div>
  );
};

export default DeliveryDashboard;
