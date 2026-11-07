import { useContext, useState } from "react";
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
      const orderPayload = {
        items: cart.map((item) => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        deliveryAddress: address,
        orderNotes: orderNotes,
        paymentMethod:
          paymentMethod === "Telebirr" || paymentMethod === "CBE" || paymentMethod === "CBEBirr"
            ? paymentMethod
            : "Cash",
        couponCode: appliedCoupon?.code || "",
      };

      const res = await apiClient.post("/orders", orderPayload);
      const newOrderId = res.data.orderId || res.data.order?._id;
      const orderAmount = res.data.order?.totalAmount || finalTotal;

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
            <h3 className="column-title">{t("deliveryAddress")}</h3>

            <div className="input-group">
              <label>{t("deliveryAddress")} *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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

              <div className="summary-row total-row">
                <span>{t("totalAmount")}</span>
                <span>{finalTotal.toFixed(2)} ETB</span>
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
                  ? `${t("payWithTelebirr")} • ${finalTotal.toFixed(2)} ETB ➔`
                  : paymentMethod === "CBEBirr"
                    ? `${t("payWithCbeBirr")} • ${finalTotal.toFixed(2)} ETB ➔`
                    : paymentMethod === "CBE"
                      ? `${t("payWithCbeAccount") || t("payWithCbe")} • ${finalTotal.toFixed(2)} ETB ➔`
                      : paymentMethod === "Card"
                        ? `${t("proceedPayment")} • ${finalTotal.toFixed(2)} ETB`
                        : `${t("placeOrderCash")} • ${finalTotal.toFixed(2)} ETB ➔`}
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
          amount={activeOrderAmount || finalTotal}
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
              amount={finalTotal}
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
