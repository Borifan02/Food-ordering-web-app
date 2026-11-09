import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import { getSocket } from "../../utils/socket";
import UserProfileManager from "../../components/Profile/UserProfileManager";
import apiClient from "../../api/axios";
import "./DeliveryDashboard.css";

// Simulated GPS transit path across Addis Ababa (Bole Medhanialem -> Atlas -> Urael -> Kazanchis)
const ADDIS_WAYPOINTS = [
  { latitude: 9.0015, longitude: 38.7845, heading: 45, label: "Bole Medhanialem" },
  { latitude: 9.0068, longitude: 38.7882, heading: 60, label: "Edna Mall Junction" },
  { latitude: 9.0125, longitude: 38.7924, heading: 75, label: "Atlas Hotel Road" },
  { latitude: 9.0189, longitude: 38.7961, heading: 90, label: "Urael / Bambis Area" },
  { latitude: 9.0234, longitude: 38.7998, heading: 110, label: "Kazanchis Commercial District" },
  { latitude: 9.0287, longitude: 38.8035, heading: 135, label: "Customer Delivery Gate" }
];

const DeliveryDashboard = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [totalTips, setTotalTips] = useState(0);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "active");
  const [driverStatus, setDriverStatus] = useState("available"); // "available", "busy", "offline"
  const [loading, setLoading] = useState(false);

  // Live GPS Simulation state
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const [currentWaypoint, setCurrentWaypoint] = useState(null);
  const gpsIndexRef = useRef(0);

  // Live Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatMessagesEndRef = useRef(null);

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

          socket.on("order-cancelled", () => {
            fetchPendingOrders();
            fetchActiveDelivery();
          });

          socket.on("order-status-changed", () => {
            fetchPendingOrders();
          });

          socket.on("order-message", (data) => {
            const incomingOrderId = data?.orderId || data?.message?.orderId;
            if (activeDelivery && incomingOrderId === activeDelivery._id) {
              const msg = data.message || data;
              setChatMessages((prev) => {
                const exists = prev.some((m) => m._id === msg._id || (m.timestamp === msg.timestamp && m.text === msg.text));
                return exists ? prev : [...prev, msg];
              });
            }
          });
        }

        return () => {
          if (socket) {
            socket.off("delivery-assigned");
            socket.off("new-order");
            socket.off("order-cancelled");
            socket.off("order-status-changed");
            socket.off("order-message");
          }
        };
      }
    }
  }, [user, navigate, activeDelivery]);

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
      if (res.data?._id) {
        fetchOrderMessages(res.data._id);
      }
    } catch (err) {
      console.error("Error fetching active delivery:", err);
      setActiveDelivery(null);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get("/delivery/history");
      setDeliveryHistory(res.data.orders || []);
      if (res.data.totalTips !== undefined) {
        setTotalTips(res.data.totalTips);
      }
    } catch (err) {
      console.error("Error fetching delivery history:", err);
    }
  };

  const fetchOrderMessages = async (orderId) => {
    try {
      const res = await apiClient.get(`/orders/${orderId}/messages`);
      setChatMessages(res.data || []);
    } catch (err) {
      console.error("Error fetching order messages:", err);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = (typeof customText === "string" ? customText : newChatMessage).trim();
    if (!textToSend || !activeDelivery) return;

    setSendingMessage(true);
    try {
      const res = await apiClient.post(`/orders/${activeDelivery._id}/messages`, {
        text: textToSend
      });
      setChatMessages((prev) => [...prev, res.data]);
      setNewChatMessage("");

      const socket = getSocket();
      if (socket) {
        socket.emit("order-message", {
          orderId: activeDelivery._id,
          message: res.data
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Toggle GPS Route Simulation
  const toggleGpsSimulation = () => {
    if (!activeDelivery) {
      toast.warning("No active delivery to broadcast GPS for!");
      return;
    }

    if (isSimulatingGps) {
      setIsSimulatingGps(false);
      toast.info("⏹️ GPS Broadcast paused.");
    } else {
      setIsSimulatingGps(true);
      toast.success("📍 Live GPS Simulation active! Streaming coordinates to customer.");
    }
  };

  // Run GPS simulation loop
  useEffect(() => {
    let interval = null;
    if (isSimulatingGps && activeDelivery) {
      const socket = getSocket();
      const initialPt = ADDIS_WAYPOINTS[gpsIndexRef.current % ADDIS_WAYPOINTS.length];
      setCurrentWaypoint(initialPt);

      interval = setInterval(async () => {
        gpsIndexRef.current = (gpsIndexRef.current + 1) % ADDIS_WAYPOINTS.length;
        const pt = ADDIS_WAYPOINTS[gpsIndexRef.current];
        setCurrentWaypoint(pt);

        if (socket) {
          socket.emit("driver-location-update", {
            orderId: activeDelivery._id,
            latitude: pt.latitude,
            longitude: pt.longitude,
            heading: pt.heading
          });
        }

        try {
          await apiClient.post(`/orders/${activeDelivery._id}/location`, {
            latitude: pt.latitude,
            longitude: pt.longitude,
            heading: pt.heading
          });
        } catch (e) {
          // ignore transient simulation errors
        }
      }, 3500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulatingGps, activeDelivery]);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

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
    setIsSimulatingGps(false);
    try {
      await apiClient.post(`/delivery/mark-delivered/${orderId}`);
      toast.success("Great job! Order marked as successfully delivered. 🎉");
      setActiveDelivery(null);
      setIsChatOpen(false);
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
          <span className="d-stat-label">💰 {t("totalTipsEarned")}</span>
          <span className="d-stat-val text-green">{totalTips.toFixed(2)} ETB</span>
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

              {/* Gursha Tip Notice */}
              {activeDelivery.tipAmount > 0 && (
                <div className="driver-gursha-notice">
                  <span className="gursha-coin-icon">🎁</span>
                  <div>
                    <strong>{t("gurshaTip") || "Courier Gursha (ጉርሻ)"}: +{Number(activeDelivery.tipAmount).toFixed(2)} ETB</strong>
                    <div className="gursha-subtext">Customer added a gratuity. Credited directly to your tip earnings upon completion!</div>
                  </div>
                </div>
              )}

              {/* Courier Live Actions Toolbar */}
              <div className="driver-actions-toolbar">
                <button
                  type="button"
                  className={`driver-action-btn ${isSimulatingGps ? "btn-gps-active" : "btn-gps"}`}
                  onClick={toggleGpsSimulation}
                >
                  {isSimulatingGps ? t("stopGpsSimulation") : t("startGpsSimulation")}
                </button>
                <button
                  type="button"
                  className={`driver-action-btn btn-chat-toggle ${isChatOpen ? "active-chat" : ""}`}
                  onClick={() => setIsChatOpen(!isChatOpen)}
                >
                  💬 {t("liveOrderChat")} {chatMessages.length > 0 && `(${chatMessages.length})`}
                </button>
              </div>

              {/* Live GPS Broadcast Telemetry Banner */}
              {isSimulatingGps && (
                <div className="driver-gps-status-banner">
                  <div className="gps-radar-pulse"></div>
                  <div className="gps-telemetry-text">
                    <strong>📡 {t("liveCourierTracker")}:</strong>
                    <span>
                      {currentWaypoint?.label || "En route"} ({currentWaypoint?.latitude?.toFixed(4)}°N, {currentWaypoint?.longitude?.toFixed(4)}°E)
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive In-App Chat Drawer */}
              {isChatOpen && (
                <div className="driver-chat-box">
                  <div className="driver-chat-header">
                    <h4>💬 {t("liveOrderChat")} - {activeDelivery.userId?.firstName || "Customer"}</h4>
                    <button className="chat-close-btn" onClick={() => setIsChatOpen(false)}>✕</button>
                  </div>

                  <div className="driver-quick-replies">
                    <button
                      type="button"
                      className="quick-chip"
                      onClick={() => handleSendMessage("🛵 I have picked up your meal and am on my way!")}
                    >
                      🛵 Heading your way
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      onClick={() => handleSendMessage("🚦 Light traffic in the area, ETA ~10 minutes.")}
                    >
                      🚦 Brief traffic
                    </button>
                    <button
                      type="button"
                      className="quick-chip"
                      onClick={() => handleSendMessage("📍 I have arrived outside your gate/entrance. Please come receive your meal!")}
                    >
                      📍 Arrived at gate
                    </button>
                  </div>

                  <div className="driver-chat-thread">
                    {chatMessages.length === 0 ? (
                      <div className="no-chat-messages">
                        <span>👋</span> No messages yet. Send a quick update to the customer!
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => {
                        const isMe = msg.senderRole === "delivery" || msg.senderId === user?._id;
                        return (
                          <div key={idx} className={`chat-bubble-row ${isMe ? "outgoing" : "incoming"}`}>
                            <div className="chat-bubble">
                              <span className="bubble-sender">{msg.senderName || (isMe ? "You" : "Customer")}</span>
                              <p className="bubble-text">{msg.text}</p>
                              <span className="bubble-time">
                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  <form
                    className="driver-chat-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                  >
                    <input
                      type="text"
                      className="driver-chat-input"
                      placeholder={t("chatInputPlaceholder")}
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="driver-chat-send-btn"
                      disabled={sendingMessage || !newChatMessage.trim()}
                    >
                      {sendingMessage ? "..." : "➤"}
                    </button>
                  </form>
                </div>
              )}

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
