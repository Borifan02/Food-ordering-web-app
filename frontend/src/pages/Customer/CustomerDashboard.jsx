import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import UserProfileManager from "../../components/Profile/UserProfileManager";
import "./CustomerDashboard.css";

const CustomerDashboard = () => {
  const { user } = useContext(AuthContext);
  const { addToCart, reorderItems } = useContext(CartContext);
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // "overview", "active-orders", "reorder", "profile"
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch customer orders and menu items
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, menuRes] = await Promise.all([
          apiClient.get("/orders"),
          apiClient.get("/menu"),
        ]);
        setOrders(ordersRes.data || []);
        setMenuItems(menuRes.data || []);
      } catch (err) {
        console.error("Error loading customer dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Customer KPI Metrics
  const totalOrders = orders.length;

  const activeOrdersList = useMemo(() => {
    return orders.filter(
      (o) => o.status === "pending" || o.status === "Preparing" || o.status === "onTheWay"
    );
  }, [orders]);

  const completedOrdersList = useMemo(() => {
    return orders.filter((o) => o.status === "delivered");
  }, [orders]);

  const totalSpent = useMemo(() => {
    return completedOrdersList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [completedOrdersList]);

  // Loyalty points (1 point per 10 ETB spent)
  const loyaltyPoints = Math.floor(totalSpent / 10);

  // Recent items for quick 1-click reorder
  const recentOrders = useMemo(() => {
    return orders.slice(0, 4);
  }, [orders]);

  // Handle Quick Reorder
  const handleQuickReorder = (order) => {
    if (order.items?.length) {
      reorderItems(order.items);
      toast.success("Items added to your cart! Taking you to checkout... 🛒");
      navigate("/cart");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-badge-pending";
      case "Preparing":
        return "status-badge-preparing";
      case "onTheWay":
        return "status-badge-ontheway";
      case "delivered":
        return "status-badge-delivered";
      default:
        return "status-badge-default";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return t("statusPending");
      case "Preparing":
        return t("statusPreparing");
      case "onTheWay":
        return t("statusOnTheWay");
      case "delivered":
        return t("statusDelivered");
      case "cancelled":
        return t("statusCancelled");
      default:
        return status;
    }
  };

  return (
    <div className="customer-dashboard-container">
      {/* Personalized Welcome Banner */}
      <div className="customer-hero-banner">
        <div className="customer-hero-left">
          <span className="customer-pill-badge">🌟 {t("customerDashboard")}</span>
          <h1>
            {user?.firstName ? `${t("welcomeBack")}, ${user.firstName}!` : t("welcomeGreeting")} 👋
          </h1>
          <p>{t("welcomeSubtitle")}</p>
          <div className="customer-quick-actions">
            <button className="cust-hero-btn primary" onClick={() => navigate("/menu")}>
              🍽️ {t("menu")}
            </button>
            <button className="cust-hero-btn secondary" onClick={() => navigate("/cart")}>
              🛍️ {t("cart")}
            </button>
            <button className="cust-hero-btn secondary" onClick={() => navigate("/orders")}>
              📜 {t("orders")}
            </button>
          </div>
        </div>

        <div className="customer-loyalty-card">
          <div className="loyalty-icon">🏆</div>
          <div className="loyalty-info">
            <span className="loyalty-label">{t("loyaltyPoints")}</span>
            <strong className="loyalty-points">{loyaltyPoints} PTS</strong>
            <small>Earn 1 pt per 10 ETB spent</small>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="customer-kpi-grid">
        <div className="cust-kpi-card">
          <span className="cust-kpi-icon">📦</span>
          <div className="cust-kpi-body">
            <span className="cust-kpi-label">{t("allOrders")}</span>
            <h3 className="cust-kpi-val">{totalOrders}</h3>
            <small>{t("allTimeCompleted")}</small>
          </div>
        </div>

        <div className="cust-kpi-card highlight-active">
          <span className="cust-kpi-icon">🛵</span>
          <div className="cust-kpi-body">
            <span className="cust-kpi-label">{t("activeOrders")}</span>
            <h3 className="cust-kpi-val">{activeOrdersList.length}</h3>
            <small>{activeOrdersList.length > 0 ? "Tracking in real-time" : "No active deliveries"}</small>
          </div>
        </div>

        <div className="cust-kpi-card">
          <span className="cust-kpi-icon">💰</span>
          <div className="cust-kpi-body">
            <span className="cust-kpi-label">{t("totalSpent")}</span>
            <h3 className="cust-kpi-val">{totalSpent.toFixed(2)} ETB</h3>
            <small>Delicious food enjoyed</small>
          </div>
        </div>

        <div className="cust-kpi-card">
          <span className="cust-kpi-icon">📍</span>
          <div className="cust-kpi-body">
            <span className="cust-kpi-label">{t("deliveryAddress")}</span>
            <h3 className="cust-kpi-val address-val">{user?.address ? user.address.slice(0, 18) + "..." : "Addis Ababa"}</h3>
            <small>{user?.phone || "+251..."}</small>
          </div>
        </div>
      </div>

      {/* Dashboard Navigation Tabs */}
      <div className="customer-dashboard-tabs">
        <button
          className={`cust-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 {t("dashboardOverview")}
        </button>
        <button
          className={`cust-tab-btn ${activeTab === "active-orders" ? "active" : ""}`}
          onClick={() => setActiveTab("active-orders")}
        >
          🛵 {t("activeOrders")} ({activeOrdersList.length})
        </button>
        <button
          className={`cust-tab-btn ${activeTab === "reorder" ? "active" : ""}`}
          onClick={() => setActiveTab("reorder")}
        >
          ↺ {t("quickReorder")}
        </button>
        <button
          className={`cust-tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          🔒 {t("profileAndSecurity")}
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="customer-tab-pane">
          {/* Active Orders Live Tracker Preview */}
          {activeOrdersList.length > 0 && (
            <div className="cust-section-box">
              <div className="cust-section-header">
                <h3>🛵 {t("activeOrders")}</h3>
                <span className="live-pulse-badge">🔴 LIVE TRACKING</span>
              </div>

              <div className="active-orders-grid">
                {activeOrdersList.map((order) => (
                  <div key={order._id} className="active-order-card">
                    <div className="active-order-header">
                      <div>
                        <span className="order-num-pill">{t("orderId")}{order._id.slice(-6)}</span>
                        <div className="order-time-snippet">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="active-order-items">
                      {order.items.map((i, idx) => (
                        <span key={idx} className="item-chip-snippet">
                          {i.quantity}x {i.name}
                        </span>
                      ))}
                    </div>

                    <div className="active-order-footer">
                      <div className="order-price-box">
                        <small>{t("totalAmount")}</small>
                        <strong>{Number(order.totalAmount).toFixed(2)} ETB</strong>
                      </div>
                      <button
                        className="btn-track-live"
                        onClick={() => navigate(`/orders/${order._id}`)}
                      >
                        🛵 {t("trackLiveOrder")} ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick 1-Click Reorder Section */}
          <div className="cust-section-box">
            <div className="cust-section-header">
              <h3>↺ {t("quickReorder")}</h3>
              <button className="view-all-link-btn" onClick={() => navigate("/orders")}>
                {t("myOrderHistory")} ➔
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="empty-state-box">
                <p>{t("noActiveOrders")}</p>
                <button className="cust-primary-btn" onClick={() => navigate("/menu")}>
                  {t("orderNowBtn")}
                </button>
              </div>
            ) : (
              <div className="recent-orders-grid">
                {recentOrders.map((order) => (
                  <div key={order._id} className="recent-order-card">
                    <div className="recent-order-top">
                      <div>
                        <strong>{new Date(order.createdAt).toLocaleDateString()}</strong>
                        <span className="recent-order-id">#{order._id.slice(-6)}</span>
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <p className="recent-items-desc">
                      {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                    </p>

                    <div className="recent-order-bottom">
                      <span className="recent-order-price">
                        {Number(order.totalAmount).toFixed(2)} ETB
                      </span>
                      <button
                        className="btn-reorder-action"
                        onClick={() => handleQuickReorder(order)}
                      >
                        ↺ {t("reorder")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Featured Dishes Section */}
          {menuItems.length > 0 && (
            <div className="cust-section-box">
              <div className="cust-section-header">
                <h3>🍽️ {t("allDishes")}</h3>
                <button className="view-all-link-btn" onClick={() => navigate("/menu")}>
                  {t("exploreMenuBtn")}
                </button>
              </div>

              <div className="featured-menu-grid">
                {menuItems.slice(0, 4).map((dish) => (
                  <div key={dish._id} className="cust-dish-card">
                    <img
                      src={dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300"}
                      alt={dish.name}
                      className="cust-dish-img"
                    />
                    <div className="cust-dish-content">
                      <h4>{dish.name}</h4>
                      <p className="cust-dish-desc">{dish.description?.slice(0, 60)}...</p>
                      <div className="cust-dish-footer">
                        <strong>{Number(dish.price).toFixed(2)} ETB</strong>
                        <button
                          className="btn-dish-add"
                          onClick={() => {
                            addToCart(dish, 1);
                            toast.success(`Added ${dish.name} to cart! 🛒`);
                          }}
                        >
                          {t("addToCart")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ACTIVE ORDERS */}
      {activeTab === "active-orders" && (
        <div className="customer-tab-pane">
          <div className="cust-section-box">
            <div className="cust-section-header">
              <h3>🛵 {t("activeOrders")} ({activeOrdersList.length})</h3>
            </div>

            {activeOrdersList.length === 0 ? (
              <div className="empty-state-box">
                <span className="empty-icon">🛵</span>
                <h4>{t("noActiveOrders")}</h4>
                <p>Browse our handcrafted menu and order delicious Ethiopian meals today!</p>
                <button className="cust-primary-btn" onClick={() => navigate("/menu")}>
                  {t("orderNowBtn")}
                </button>
              </div>
            ) : (
              <div className="active-orders-grid">
                {activeOrdersList.map((order) => (
                  <div key={order._id} className="active-order-card detailed">
                    <div className="active-order-header">
                      <div>
                        <h4>{t("orderId")} {order._id}</h4>
                        <small>{new Date(order.createdAt).toLocaleString()}</small>
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="order-address-box">
                      📍 <strong>{t("deliveryAddress")}:</strong> {order.deliveryAddress}
                    </div>

                    <div className="active-items-list-box">
                      <h5>{t("orderItems")}:</h5>
                      <ul>
                        {order.items.map((i, idx) => (
                          <li key={idx}>
                            {i.quantity}x {i.name} - {Number(i.price * i.quantity).toFixed(2)} ETB
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="active-order-footer">
                      <div className="order-price-box">
                        <small>{t("totalAmount")}</small>
                        <strong>{Number(order.totalAmount).toFixed(2)} ETB</strong>
                      </div>
                      <button
                        className="btn-track-live"
                        onClick={() => navigate(`/orders/${order._id}`)}
                      >
                        🛵 {t("trackLiveOrder")} ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: REORDER */}
      {activeTab === "reorder" && (
        <div className="customer-tab-pane">
          <div className="cust-section-box">
            <div className="cust-section-header">
              <h3>↺ {t("quickReorder")}</h3>
            </div>

            <div className="recent-orders-grid">
              {orders.map((order) => (
                <div key={order._id} className="recent-order-card">
                  <div className="recent-order-top">
                    <div>
                      <strong>{new Date(order.createdAt).toLocaleDateString()}</strong>
                      <span className="recent-order-id">#{order._id.slice(-6)}</span>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <p className="recent-items-desc">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </p>

                  <div className="recent-order-bottom">
                    <span className="recent-order-price">
                      {Number(order.totalAmount).toFixed(2)} ETB
                    </span>
                    <button
                      className="btn-reorder-action"
                      onClick={() => handleQuickReorder(order)}
                    >
                      ↺ {t("reorder")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PROFILE & SECURITY */}
      {activeTab === "profile" && (
        <div className="customer-tab-pane">
          <UserProfileManager />
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;

