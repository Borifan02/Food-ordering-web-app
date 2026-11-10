import { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import { getSocket } from "../../utils/socket";
import UserProfileManager from "../../components/Profile/UserProfileManager";
import "./CustomerDashboard.css";

const CustomerDashboard = () => {
  const { user } = useContext(AuthContext);
  const { addToCart, reorderItems } = useContext(CartContext);
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // "overview", "active-orders", "reorder", "addresses", "profile"
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [favoritesList, setFavoritesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Saved Addresses State
  const [addresses, setAddresses] = useState([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    address: "",
    subCity: "Bole",
    phone: "",
    isDefault: false
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // Fetch customer orders, menu items, favorites, and saved addresses
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, menuRes, favRes, addrRes] = await Promise.all([
          apiClient.get("/orders"),
          apiClient.get("/menu"),
          apiClient.get("/auth/favorites").catch(() => ({ data: [] })),
          apiClient.get("/auth/addresses").catch(() => ({ data: { addresses: [] } })),
        ]);
        setOrders(ordersRes.data || []);
        setMenuItems(menuRes.data || []);
        setFavoritesList(favRes.data || []);
        setAddresses(addrRes.data?.addresses || []);
        if (user?.phone) {
          setAddressForm((prev) => ({ ...prev, phone: user.phone }));
        }
      } catch (err) {
        console.error("Error loading customer dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.address.trim()) {
      toast.warning("Please enter a street, building, or landmark address");
      return;
    }
    setAddressSubmitting(true);
    try {
      const res = await apiClient.post("/auth/addresses", addressForm);
      setAddresses(res.data.addresses || []);
      toast.success("Delivery address saved successfully! 📍");
      setIsAddressModalOpen(false);
      setAddressForm({
        label: "Home",
        address: "",
        subCity: "Bole",
        phone: user?.phone || "",
        isDefault: false
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add address");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this delivery address?")) return;
    try {
      const res = await apiClient.delete(`/auth/addresses/${addressId}`);
      setAddresses(res.data.addresses || []);
      toast.success("Address removed successfully");
    } catch (err) {
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const res = await apiClient.patch(`/auth/addresses/${addressId}/default`);
      setAddresses(res.data.addresses || []);
      toast.success("Default delivery address updated! ⭐");
    } catch (err) {
      toast.error("Failed to set default address");
    }
  };

  // Real-time socket updates for order status transitions
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const refreshOrders = async () => {
      try {
        const ordersRes = await apiClient.get("/orders");
        setOrders(ordersRes.data || []);
      } catch { }
    };

    socket.on("order-status-changed", refreshOrders);
    socket.on("delivery-status-changed", refreshOrders);
    socket.on("delivery-completed", refreshOrders);

    return () => {
      socket.off("order-status-changed", refreshOrders);
      socket.off("delivery-status-changed", refreshOrders);
      socket.off("delivery-completed", refreshOrders);
    };
  }, [user]);

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

        <div
          className="cust-kpi-card"
          onClick={() => setActiveTab("addresses")}
          style={{ cursor: "pointer" }}
          title="Click to view & manage saved addresses"
        >
          <span className="cust-kpi-icon">📍</span>
          <div className="cust-kpi-body">
            <span className="cust-kpi-label">{t("savedAddressesTitle")} ({addresses.length})</span>
            <h3 className="cust-kpi-val address-val">
              {addresses.find((a) => a.isDefault)?.label
                ? `${addresses.find((a) => a.isDefault).label}: ${addresses.find((a) => a.isDefault).subCity}`
                : (user?.address ? user.address.slice(0, 18) + "..." : "Addis Ababa")}
            </h3>
            <small>Manage addresses ➔</small>
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
          className={`cust-tab-btn ${activeTab === "addresses" ? "active" : ""}`}
          onClick={() => setActiveTab("addresses")}
        >
          📍 {t("savedAddressesTitle")} ({addresses.length})
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
                        <span className="order-num-pill">{t("orderId")} #{order._id.slice(-6)}</span>
                        <div className="order-time-snippet">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="header-badges-wrap">
                        {order.isScheduled && order.scheduledDeliveryTime && (
                          <span className="scheduled-order-badge">
                            🕒 {new Date(order.scheduledDeliveryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        <span className={`payment-pill-small ${order.payment?.status === "Paid" ? "paid" : "pending"}`}>
                          {order.payment?.status === "Paid" ? "✓ Paid" : "⏳ Pay Pending"}
                        </span>
                        <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
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

          {/* Favorite Dishes Section */}
          {favoritesList.length > 0 && (
            <div className="cust-section-box">
              <div className="cust-section-header">
                <h3>❤️ {t("myFavoriteDishes") || "My Favorite Dishes"} ({favoritesList.length})</h3>
                <button className="view-all-link-btn" onClick={() => navigate("/menu")}>
                  {t("exploreMenuBtn")}
                </button>
              </div>

              <div className="featured-menu-grid">
                {favoritesList.map((dish) => (
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
                          + {t("addToCart")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        <h4>{t("orderId")} #{order._id.slice(-6)}</h4>
                        <small>{new Date(order.createdAt).toLocaleString()}</small>
                      </div>
                      <div className="header-badges-wrap">
                        {order.isScheduled && order.scheduledDeliveryTime && (
                          <span className="scheduled-order-badge">
                            🕒 {new Date(order.scheduledDeliveryTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        <span className={`payment-pill-small ${order.payment?.status === "Paid" ? "paid" : "pending"}`}>
                          {order.payment?.status === "Paid" ? "✓ Paid" : "⏳ Pay Pending"}
                        </span>
                        <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
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

      {/* TAB CONTENT: SAVED ADDRESSES */}
      {activeTab === "addresses" && (
        <div className="customer-tab-pane">
          <div className="cust-section-box">
            <div className="cust-section-header">
              <div>
                <h3>📍 {t("savedAddressesTitle")} ({addresses.length})</h3>
                <p className="section-subtitle-text" style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                  Save and manage delivery locations across Addis Ababa with neighborhood landmarks.
                </p>
              </div>
              <button
                type="button"
                className="cust-primary-btn"
                onClick={() => setIsAddressModalOpen(true)}
              >
                {t("addNewAddress")}
              </button>
            </div>

            {/* Address Modal / Drawer */}
            {isAddressModalOpen && (
              <div className="cust-address-modal-overlay">
                <div className="cust-address-modal-card">
                  <div className="modal-header-row">
                    <h4>📍 {t("addNewAddress")}</h4>
                    <button
                      type="button"
                      className="modal-close-icon"
                      onClick={() => setIsAddressModalOpen(false)}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddAddress} className="cust-address-form">
                    <div className="form-group-custom">
                      <label style={{ display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "0.85rem", color: "#334155" }}>
                        Label
                      </label>
                      <div className="label-selector-pills">
                        {["Home", "Work", "Family", "Other"].map((lbl) => (
                          <button
                            type="button"
                            key={lbl}
                            className={`label-pill-btn ${addressForm.label === lbl ? "active" : ""}`}
                            onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                          >
                            {lbl === "Home" && "🏠 "}
                            {lbl === "Work" && "💼 "}
                            {lbl === "Family" && "👨‍👩‍👧 "}
                            {lbl === "Other" && "📍 "}
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group-custom">
                      <label style={{ display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "0.85rem", color: "#334155" }}>
                        {t("subCityLabel")}
                      </label>
                      <select
                        className="cust-select-input"
                        value={addressForm.subCity}
                        onChange={(e) => setAddressForm({ ...addressForm, subCity: e.target.value })}
                      >
                        <option value="Bole">Bole (ቦሌ)</option>
                        <option value="Kirkos">Kirkos (ቂርቆስ)</option>
                        <option value="Yeka">Yeka (የካ)</option>
                        <option value="Arada">Arada (አራዳ)</option>
                        <option value="Lideta">Lideta (ልደታ)</option>
                        <option value="Nifas Silk-Lafto">Nifas Silk-Lafto (ንፋስ ስልክ ላፍቶ)</option>
                        <option value="Kolfe Keranio">Kolfe Keranio (ኮልፌ ቀራኒዮ)</option>
                        <option value="Gullele">Gullele (ጉለሌ)</option>
                        <option value="Akaky Kaliti">Akaky Kaliti (አቃቂ ቃሊቲ)</option>
                        <option value="Addis Ketema">Addis Ketema (አዲስ ከተማ)</option>
                        <option value="Lemi Kura">Lemi Kura (ለሚ ኩራ)</option>
                      </select>
                    </div>

                    <div className="form-group-custom">
                      <label style={{ display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "0.85rem", color: "#334155" }}>
                        {t("deliveryAddress")} (Street, House No, or Landmark)
                      </label>
                      <input
                        type="text"
                        className="cust-text-input"
                        placeholder="e.g., Behind Edna Mall, Bole Medhanialem, House 452"
                        value={addressForm.address}
                        onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                        required
                      />
                      <div className="quick-neighborhood-chips" style={{ marginTop: "8px" }}>
                        <span className="chips-title" style={{ fontSize: "0.8rem", color: "#64748b", marginRight: "6px" }}>
                          {t("addisNeighborhoods")}:
                        </span>
                        {[
                          "Bole Medhanialem",
                          "Atlas Hotel area",
                          "Kazanchis UNECA",
                          "CMC Michael",
                          "Sarbet AU HQ",
                          "Gerji Imperial"
                        ].map((nh) => (
                          <button
                            key={nh}
                            type="button"
                            className="nh-chip-btn"
                            onClick={() =>
                              setAddressForm((prev) => ({
                                ...prev,
                                address: prev.address ? `${prev.address}, ${nh}` : nh
                              }))
                            }
                          >
                            + {nh}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group-custom">
                      <label style={{ display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "0.85rem", color: "#334155" }}>
                        {t("phoneNumber")}
                      </label>
                      <input
                        type="tel"
                        className="cust-text-input"
                        placeholder="0911234567 or +251911234567"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-checkbox-custom" style={{ margin: "14px 0" }}>
                      <label className="checkbox-label-flex" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                        />
                        <span style={{ fontSize: "0.9rem", color: "#1e293b", fontWeight: 600 }}>{t("setDefaultAddressBtn")}</span>
                      </label>
                    </div>

                    <div className="modal-actions-row">
                      <button
                        type="button"
                        className="cust-btn-cancel"
                        onClick={() => setIsAddressModalOpen(false)}
                      >
                        {t("cancel") || "Cancel"}
                      </button>
                      <button
                        type="submit"
                        className="cust-primary-btn"
                        disabled={addressSubmitting}
                      >
                        {addressSubmitting ? "Saving..." : "Save Address"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Addresses Cards Grid */}
            {addresses.length === 0 ? (
              <div className="empty-state-box">
                <span className="empty-icon">📍</span>
                <h4>No saved delivery addresses yet</h4>
                <p>Save home, office, and frequent delivery locations in Addis Ababa for 1-click checkout.</p>
                <button
                  type="button"
                  className="cust-primary-btn"
                  onClick={() => setIsAddressModalOpen(true)}
                >
                  {t("addNewAddress")}
                </button>
              </div>
            ) : (
              <div className="cust-addresses-grid">
                {addresses.map((addr) => (
                  <div key={addr._id} className={`cust-address-card ${addr.isDefault ? "is-default" : ""}`}>
                    <div className="addr-card-top">
                      <div className="addr-label-wrap">
                        <span className="addr-icon">
                          {addr.label === "Home" ? "🏠" : addr.label === "Work" ? "💼" : addr.label === "Family" ? "👨‍👩‍👧" : "📍"}
                        </span>
                        <strong>{addr.label || "Delivery Location"}</strong>
                        {addr.isDefault && <span className="default-pill-badge">⭐ {t("defaultBadge")}</span>}
                      </div>
                      <span className="subcity-tag">{addr.subCity}</span>
                    </div>

                    <p className="addr-text">{addr.address}</p>
                    {addr.phone && <div className="addr-phone">📞 {addr.phone}</div>}

                    <div className="addr-card-actions">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          className="btn-set-default"
                          onClick={() => handleSetDefaultAddress(addr._id)}
                        >
                          ⭐ {t("setDefaultAddressBtn")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-delete-addr"
                        onClick={() => handleDeleteAddress(addr._id)}
                        title="Remove address"
                      >
                        🗑️ {t("delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

