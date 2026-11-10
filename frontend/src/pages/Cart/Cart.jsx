import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import apiClient from "../../api/axios";
import StripePayment from "../../components/StripePayment/PaymentForm";
import EthiopianPaymentModal from "../../components/EthiopianPayment/EthiopianPaymentModal";
import { triggerConfetti } from "../../utils/confetti";
import { formatCurrency, CURRENCY } from "../../utils/currency";
import "./Cart.css";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150";

const ADDIS_NEIGHBORHOODS = [
  "Bole Medhanialem",
  "Kazanchis",
  "Piassa",
  "Sarbet",
  "CMC Michael",
  "Hayahulet",
  "Mexico Square",
  "Gerji",
  "Summit",
  "Lebu",
];

const Cart = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    discountAmount,
    finalTotal,
    orderNotes,
    setOrderNotes,
    appliedCoupon,
    setAppliedCoupon,
  } = useContext(CartContext);

  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const userRole = (user?.role || "").trim().toLowerCase();
  const isAdmin = userRole === "admin";
  const isDriver = userRole === "deliveryman";

  const [address, setAddress] = useState(user?.address || "");
  const [paymentMethod, setPaymentMethod] = useState("Cash"); // "Cash", "Telebirr", "CBE", "CBEBirr", "Card"
  const [couponInput, setCouponInput] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showEthiopianModal, setShowEthiopianModal] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState("");
  const [activeOrderAmount, setActiveOrderAmount] = useState(0);
  const [activePaymentMethod, setActivePaymentMethod] = useState("Telebirr");
  const [activeOrderItems, setActiveOrderItems] = useState([]);

  // Delivery Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("today");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("12:30 PM");

  // Saved Addresses state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  // Courier Gursha (Tip) state
  const [selectedTip, setSelectedTip] = useState(0); // 0, 20, 50, 100, "custom"
  const [customTip, setCustomTip] = useState("");

  // Load user saved addresses
  useEffect(() => {
    if (user) {
      apiClient
        .get("/auth/addresses")
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setSavedAddresses(res.data);
            const def = res.data.find((a) => a.isDefault) || res.data[0];
            if (def && !address) {
              setAddress(def.address);
              setSelectedAddressId(def._id);
            }
          }
        })
        .catch(() => { });
    }
  }, [user]);

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr._id);
    setAddress(addr.address);
    toast.info(`Selected: ${addr.label} (${addr.address})`);
  };

  const handleAddNeighborhood = (nh) => {
    if (address.includes(nh)) return;
    setAddress((prev) => (prev ? `${prev}, ${nh}` : nh));
  };

  const tipAmount =
    selectedTip === "custom"
      ? Math.max(0, Number(customTip) || 0)
      : Number(selectedTip);
  const grandTotal = Math.max(0, Math.round((finalTotal + tipAmount) * 100) / 100);

  const TIME_SLOTS = [
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "1:00 PM",
    "1:30 PM",
    "2:00 PM",
    "6:00 PM",
    "6:30 PM",
    "7:00 PM",
    "7:30 PM",
    "8:00 PM",
    "8:30 PM",
  ];

  // Free delivery calculation
  const freeDeliveryThreshold = 25;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  // Apply Promo Coupon
  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      toast.warning("Please enter a promo code");
      return;
    }

    setValidatingCoupon(true);
    try {
      const res = await apiClient.post("/orders/validate-coupon", {
        code,
        subtotal,
      });

      if (res.data.valid) {
        setAppliedCoupon(res.data);
        setCouponInput("");
        toast.success(`Coupon "${code}" applied: ${res.data.description}! 🎉`);
      } else {
        toast.error(res.data.message || "Invalid coupon code");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not apply coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed");
  };

  // Place Cash On Delivery Order
  const handlePlaceOrder = async () => {
    const userRole = (user?.role || "").trim().toLowerCase();
    if (userRole === "admin" || userRole === "deliveryman") {
      toast.error(
        userRole === "admin"
          ? "Administrators cannot place orders. Use the Admin Dashboard to manage store operations."
          : "Delivery Partners cannot place orders. Ordering is for customer accounts only."
      );
      return;
    }

    if (!user) {
      toast.info("Please sign in or register as a Customer to place your order");
      navigate("/login");
      return;
    }
    if (cart.length === 0) {
      toast.warning("Your cart is empty!");
      return;
    }
    if (!address.trim()) {
      toast.warning("Please provide a delivery address");
      return;
    }

    if (paymentMethod === "Card") {
      setShowCardModal(true);
      return;
    }

    setLoading(true);
    try {
      // Compute scheduled delivery time if selected
      let scheduledDeliveryTime = null;
      if (isScheduled) {
        const targetDate = new Date();
        if (deliveryDate === "tomorrow") {
          targetDate.setDate(targetDate.getDate() + 1);
        }
        const [timePart, modifier] = deliveryTimeSlot.split(" ");
        let [hours, minutes] = timePart.split(":").map(Number);
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;
        targetDate.setHours(hours, minutes, 0, 0);
        scheduledDeliveryTime = targetDate.toISOString();
      }

      const orderPayload = {
        items: cart.map((item) => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        deliveryAddress: address,
        orderNotes: orderNotes,
        isScheduled,
        scheduledDeliveryTime,
        tipAmount,
        paymentMethod:
          paymentMethod === "Telebirr" || paymentMethod === "CBE" || paymentMethod === "CBEBirr"
            ? paymentMethod
            : "Cash",
        couponCode: appliedCoupon?.code || "",
      };

      const res = await apiClient.post("/orders", orderPayload);
      const newOrderId = res.data.orderId || res.data.order?._id;
      const orderAmount = res.data.order?.totalAmount || grandTotal;

      if (
        paymentMethod === "Telebirr" ||
        paymentMethod === "CBE" ||
        paymentMethod === "CBEBirr" ||
        paymentMethod === "BankTransfer"
      ) {
        setActiveOrderId(newOrderId);
        setActiveOrderAmount(orderAmount);
        setActivePaymentMethod(paymentMethod);
        setActiveOrderItems([...cart]);
        setShowEthiopianModal(true);
        clearCart();
        return;
      } else {
        triggerConfetti();
        toast.success("Order placed successfully with Cash on Delivery! 🍕🎉");
        clearCart();
        if (newOrderId) {
          navigate(`/orders/${newOrderId}`);
        } else {
          navigate("/orders");
        }
      }
    } catch (err) {
      console.error("Order error:", err);
      toast.error(err.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Ethiopian Local Payment Success Handler (Telebirr, CBE, Banks)
  const handleEthiopianPaymentSuccess = (paymentData) => {
    setShowEthiopianModal(false);
    const orderId = paymentData?.orderId || activeOrderId;
    if (orderId) {
      navigate(`/orders/${orderId}`);
    } else {
      navigate("/orders");
    }
  };

  // Close modal when user opts to pay later
  const handleCancelEthiopianModal = () => {
    setShowEthiopianModal(false);
    if (activeOrderId) {
      toast.info("Your order is saved with 'Payment Pending'. You can complete payment anytime!");
      navigate(`/orders/${activeOrderId}`);
    }
  };

  // Card Payment Success Handler
  const handleCardPaymentSuccess = async (paymentIntent) => {
    setLoading(true);
    try {
      const orderPayload = {
        items: cart.map((item) => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        deliveryAddress: address,
        orderNotes: orderNotes,
        paymentMethod: "Card",
        paymentIntentId: paymentIntent.id,
        tipAmount,
        couponCode: appliedCoupon?.code || "",
      };

      const res = await apiClient.post("/orders", orderPayload);
      triggerConfetti();
      toast.success("Card payment confirmed & Order placed! 💳✨");
      clearCart();
      setShowCardModal(false);
      const orderId = res.data.orderId || res.data.order?._id;
      if (orderId) {
        navigate(`/orders/${orderId}`);
      } else {
        navigate("/orders");
      }
    } catch (err) {
      console.error("Order completion error:", err);
      toast.error(err.response?.data?.message || "Payment received but failed to record order. Contact support.");
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin || isDriver) {
    return (
      <div className="empty-cart-container">
        <div className="empty-cart-card role-restricted-cart-card">
          <div className="role-restricted-cart-icon">
            {isAdmin ? "🛡️" : "🛵"}
          </div>
          <span className={`role-restricted-badge ${isAdmin ? "admin" : "driver"}`}>
            {isAdmin ? "Administrator Notice" : "Delivery Partner Notice"}
          </span>
          <h2>Customer Ordering Only</h2>
          <p>
            {isAdmin
              ? "Shopping carts and food ordering are reserved exclusively for customer accounts. As an administrator, you can manage dishes, pricing, inventory, live orders, and couriers from the Admin Dashboard."
              : "Shopping carts and food ordering are reserved exclusively for customer accounts. As a delivery partner, your dashboard lets you review pickup orders, fulfill deliveries, and view earnings."}
          </p>
          <div className="role-restricted-cart-actions">
            <button
              className="role-primary-btn"
              onClick={() => navigate(isAdmin ? "/admin" : "/delivery")}
            >
              {isAdmin ? "Go to Admin Dashboard ⚙️" : "Go to Delivery Hub 🛵"}
            </button>
            <button
              className="role-secondary-btn"
              onClick={() => navigate("/menu")}
            >
              Browse Menu Preview 🍽️
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && !showEthiopianModal && !showCardModal) {
    return (
      <div className="empty-cart-container">
        <div className="empty-cart-card">
          <div className="empty-cart-icon">🛒</div>
          <h2>{t("emptyCartTitle")}</h2>
          <p>{t("emptyCartSubtitle")}</p>
          <button className="browse-menu-btn" onClick={() => navigate("/menu")}>
            {t("exploreMenuBtn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header-row">
        <h2>{t("yourCart")} 🛍️</h2>
        <button className="clear-cart-text-btn" onClick={clearCart}>
          {t("clearAll")}
        </button>
      </div>

      {/* Free Delivery Bar */}
      <div className="free-shipping-card">
        <div className="free-shipping-text">
          {amountToFreeDelivery > 0 ? (
            <span>
              🚚 {t("addMoreForFreeDelivery")} (<strong>{amountToFreeDelivery.toFixed(2)} ETB</strong> {t("addMoreForFreeDelivery")})
            </span>
          ) : (
            <span className="free-shipping-unlocked">
              {t("freeDeliveryUnlocked")}
            </span>
          )}
        </div>
        <div className="shipping-progress-track">
          <div
            className="shipping-progress-bar"
            style={{ width: `${freeDeliveryProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="cart-content-grid">
        {/* Left Column: Cart Items List */}
        <div className="cart-items-column">
          <div className="cart-items-card">
            <h3 className="column-title">{t("orderItems")} ({cart.length})</h3>

            <div className="items-list">
              {cart.map((item) => (
                <div key={item._id} className="cart-item-row">
                  <img
                    src={item.image || FALLBACK_IMG}
                    alt={item.name}
                    className="item-row-img"
                    onError={(e) => (e.target.src = FALLBACK_IMG)}
                  />

                  <div className="item-row-details">
                    <h4 className="item-name">{item.name}</h4>
                    <p className="item-unit-price">{Number(item.price).toFixed(2)} ETB {t("each")}</p>
                  </div>

                  <div className="item-row-actions">
                    <div className="cart-stepper">
                      <button
                        className="cart-stepper-btn"
                        onClick={() => updateQuantity(item._id, -1)}
                        aria-label="Decrease"
                      >
                        -
                      </button>
                      <span className="cart-stepper-qty">{item.quantity}</span>
                      <button
                        className="cart-stepper-btn"
                        onClick={() => updateQuantity(item._id, 1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>

                    <div className="item-row-total">
                      {(item.price * item.quantity).toFixed(2)} ETB
                    </div>

                    <button
                      className="cart-remove-icon-btn"
                      onClick={() => removeFromCart(item._id)}
                      title="Remove item"
                      aria-label="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Cooking Notes Card */}
          <div className="delivery-details-card">
            <h3 className="column-title">📍 {t("deliveryAddress")}</h3>

            {/* Saved Addresses Selector (if user has saved addresses) */}
            {savedAddresses.length > 0 && (
              <div className="saved-addresses-selector">
                <span className="saved-addr-label">🏷️ {t("useSavedAddress") || "Select a saved address"}:</span>
                <div className="saved-addr-pills">
                  {savedAddresses.map((sa) => (
                    <button
                      key={sa._id}
                      type="button"
                      className={`saved-addr-chip ${selectedAddressId === sa._id ? "active" : ""}`}
                      onClick={() => handleSelectSavedAddress(sa)}
                    >
                      <span className="addr-chip-icon">
                        {sa.label?.toLowerCase() === "work" ? "🏢" : "🏠"}
                      </span>
                      <strong>{sa.label}</strong>
                      {sa.subCity && <small className="addr-chip-subcity">{sa.subCity}</small>}
                      {sa.isDefault && <span className="addr-chip-default-tag">{t("defaultBadge") || "Default"}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Addis Ababa Neighborhood Chips */}
            <div className="neighborhood-chips-row">
              <span className="neighborhood-chips-label">🏙️ {t("addisNeighborhoods") || "Addis Neighborhoods"}:</span>
              <div className="neighborhood-chips-list">
                {ADDIS_NEIGHBORHOODS.map((nh) => (
                  <button
                    key={nh}
                    type="button"
                    className="neighborhood-chip-btn"
                    onClick={() => handleAddNeighborhood(nh)}
                  >
                    + {nh}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label>{t("deliveryAddress")} *</label>
              <textarea
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSelectedAddressId("");
                }}
                placeholder={t("deliveryAddressPlaceholder")}
                rows={3}
                required
              />
            </div>

            <div className="input-group">
              <label>{t("specialInstructions")}</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
              />
            </div>

            {/* Delivery Timing & Scheduling */}
            <div className="delivery-timing-section">
              <label className="timing-section-label">🕒 {t("deliveryTiming") || "Delivery Timing"}</label>
              <div className="timing-toggle-group">
                <button
                  type="button"
                  className={`timing-pill-btn ${!isScheduled ? "selected" : ""}`}
                  onClick={() => setIsScheduled(false)}
                >
                  <span className="timing-icon">⚡</span>
                  <div>
                    <strong>{t("asapDelivery") || "ASAP Delivery"}</strong>
                    <small>{t("asapDeliverySub") || "30-45 mins"}</small>
                  </div>
                </button>
                <button
                  type="button"
                  className={`timing-pill-btn ${isScheduled ? "selected" : ""}`}
                  onClick={() => setIsScheduled(true)}
                >
                  <span className="timing-icon">🕒</span>
                  <div>
                    <strong>{t("scheduleDelivery") || "Schedule Later"}</strong>
                    <small>{t("scheduleDeliverySub") || "Choose date & time"}</small>
                  </div>
                </button>
              </div>

              {isScheduled && (
                <div className="scheduled-slots-box animate-pop-in">
                  <div className="slot-field">
                    <label>{t("deliveryDate") || "Delivery Date"}</label>
                    <select
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="slot-select"
                    >
                      <option value="today">📅 {t("today") || "Today"}</option>
                      <option value="tomorrow">📅 {t("tomorrow") || "Tomorrow"}</option>
                    </select>
                  </div>

                  <div className="slot-field">
                    <label>{t("deliveryTimeSlot") || "Delivery Time Slot"}</label>
                    <select
                      value={deliveryTimeSlot}
                      onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                      className="slot-select"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          ⏰ {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout & Payment Summary */}
        <div className="checkout-summary-column">
          <div className="summary-card">
            <h3 className="summary-title">Order Summary</h3>

            {/* Promo Code Section */}
            <div className="promo-code-container">
              <label className="promo-label">Have a Promo Code?</label>

              {appliedCoupon ? (
                <div className="applied-coupon-tag">
                  <span className="coupon-code-badge">✓ {appliedCoupon.code}</span>
                  <span className="coupon-desc">{appliedCoupon.description}</span>
                  <button
                    className="remove-coupon-btn"
                    onClick={handleRemoveCoupon}
                    title="Remove coupon"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="promo-input-group">
                  <input
                    type="text"
                    placeholder="Enter promo code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  />
                  <button
                    className="apply-coupon-btn"
                    onClick={() => handleApplyCoupon()}
                    disabled={validatingCoupon}
                  >
                    {validatingCoupon ? "..." : "Apply"}
                  </button>
                </div>
              )}

              {/* Quick suggestion chips */}
              {!appliedCoupon && (
                <div className="coupon-chips-list">
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => handleApplyCoupon("WELCOME10")}
                  >
                    WELCOME10 (10% off)
                  </button>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => handleApplyCoupon("FREESHIP")}
                  >
                    FREESHIP (Free delivery)
                  </button>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => handleApplyCoupon("TASTY20")}
                  >
                    TASTY20 (20% off)
                  </button>
                </div>
              )}
            </div>

            {/* Courier Gursha (Tip) Selector */}
            <div className="gursha-tip-card">
              <div className="gursha-card-header">
                <span className="gursha-icon">🛵</span>
                <div>
                  <h4 className="gursha-title">{t("gurshaTitle") || "Courier Gursha / Tip"}</h4>
                  <p className="gursha-sub">{t("gurshaSub") || "Support your courier with an optional tip"}</p>
                </div>
              </div>

              <div className="gursha-pills-row">
                {[0, 20, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`gursha-pill-btn ${selectedTip === amount ? "active" : ""}`}
                    onClick={() => {
                      setSelectedTip(amount);
                      setCustomTip("");
                    }}
                  >
                    {amount === 0 ? (t("noGursha") || "No Tip") : `+${amount} ETB`}
                  </button>
                ))}
                <button
                  type="button"
                  className={`gursha-pill-btn ${selectedTip === "custom" ? "active" : ""}`}
                  onClick={() => setSelectedTip("custom")}
                >
                  {t("customGursha") || "Custom"}
                </button>
              </div>

              {selectedTip === "custom" && (
                <div className="custom-gursha-input-row">
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder="Enter custom ETB tip..."
                    className="custom-gursha-input"
                  />
                  <span className="currency-tag">ETB</span>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="summary-rows-box">
              <div className="summary-row">
                <span>{t("subtotal")}</span>
                <span>{subtotal.toFixed(2)} ETB</span>
              </div>

              <div className="summary-row">
                <span>{t("deliveryFee")}</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="free-badge">FREE</span>
                  ) : (
                    `${deliveryFee.toFixed(2)} ETB`
                  )}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="summary-row discount-row">
                  <span>{t("discount")}</span>
                  <span>-{discountAmount.toFixed(2)} ETB</span>
                </div>
              )}

              {tipAmount > 0 && (
                <div className="summary-row tip-row">
                  <span>🛵 {t("courierGurshaFee") || "Courier Gursha (Tip)"}</span>
                  <span>+{tipAmount.toFixed(2)} ETB</span>
                </div>
              )}

              <div className="summary-row total-row">
                <span>{t("totalAmount")}</span>
                <span>{grandTotal.toFixed(2)} ETB</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="payment-method-selector">
              <label className="payment-label">{t("paymentMethod")} 🇪🇹</label>

              <div className="payment-options-grid">
                <label
                  className={`payment-option-card ${paymentMethod === "Telebirr" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Telebirr"
                    checked={paymentMethod === "Telebirr"}
                    onChange={() => setPaymentMethod("Telebirr")}
                  />
                  <span className="option-icon">📱</span>
                  <div>
                    <div className="option-title">{t("telebirr")}</div>
                    <div className="option-sub">{t("telebirrDesc")}</div>
                  </div>
                </label>

                <label
                  className={`payment-option-card ${paymentMethod === "CBE" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CBE"
                    checked={paymentMethod === "CBE"}
                    onChange={() => setPaymentMethod("CBE")}
                  />
                  <span className="option-icon">🏦</span>
                  <div>
                    <div className="option-title">{t("cbeAccount") || "Commercial Bank of Ethiopia (CBE Account)"}</div>
                    <div className="option-sub">{t("cbeAccountDesc") || "Pay with 13-digit CBE Account Number via Web Banking"}</div>
                  </div>
                </label>

                <label
                  className={`payment-option-card ${paymentMethod === "CBEBirr" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CBEBirr"
                    checked={paymentMethod === "CBEBirr"}
                    onChange={() => setPaymentMethod("CBEBirr")}
                  />
                  <span className="option-icon">📱</span>
                  <div>
                    <div className="option-title">{t("cbeBirr") || "CBE Birr (Mobile App)"}</div>
                    <div className="option-sub">{t("cbeBirrDesc") || "Instant mobile payment via CBE Birr App or USSD *847#"}</div>
                  </div>
                </label>

                <label
                  className={`payment-option-card ${paymentMethod === "Cash" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash"
                    checked={paymentMethod === "Cash"}
                    onChange={() => setPaymentMethod("Cash")}
                  />
                  <span className="option-icon">💵</span>
                  <div>
                    <div className="option-title">{t("cashOnDelivery")}</div>
                    <div className="option-sub">{t("cashDesc")}</div>
                  </div>
                </label>

                <label
                  className={`payment-option-card ${paymentMethod === "Card" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Card"
                    checked={paymentMethod === "Card"}
                    onChange={() => setPaymentMethod("Card")}
                  />
                  <span className="option-icon">💳</span>
                  <div>
                    <div className="option-title">{t("cardPayment")}</div>
                    <div className="option-sub">{t("cardDesc")}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              className="place-order-btn"
              onClick={handlePlaceOrder}
              disabled={loading}
            >
              {loading
                ? "Placing Order..."
                : paymentMethod === "Telebirr"
                  ? `${t("payWithTelebirr")} • ${grandTotal.toFixed(2)} ETB ➔`
                  : paymentMethod === "CBEBirr"
                    ? `${t("payWithCbeBirr")} • ${grandTotal.toFixed(2)} ETB ➔`
                    : paymentMethod === "CBE"
                      ? `${t("payWithCbeAccount") || t("payWithCbe")} • ${grandTotal.toFixed(2)} ETB ➔`
                      : paymentMethod === "Card"
                        ? `${t("proceedPayment")} • ${grandTotal.toFixed(2)} ETB`
                        : `${t("placeOrderCash")} • ${grandTotal.toFixed(2)} ETB ➔`}
            </button>

            <div className="checkout-trust-badges">
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>⚡ Fast Delivery Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ethiopian Local Payment Modal (Telebirr, CBE, Banks) */}
      {showEthiopianModal && (
        <EthiopianPaymentModal
          orderId={activeOrderId}
          amount={activeOrderAmount || grandTotal}
          initialMethod={activePaymentMethod || paymentMethod}
          orderItems={activeOrderItems.length > 0 ? activeOrderItems : cart}
          onPaymentSuccess={handleEthiopianPaymentSuccess}
          onCancel={handleCancelEthiopianModal}
        />
      )}

      {/* Stripe Payment Modal */}
      {showCardModal && (
        <div className="payment-modal">
          <div
            className="payment-overlay"
            onClick={() => setShowCardModal(false)}
          ></div>
          <div className="payment-content">
            <StripePayment
              amount={grandTotal}
              onSuccess={handleCardPaymentSuccess}
              onCancel={() => setShowCardModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
