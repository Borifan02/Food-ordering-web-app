import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import StripePayment from "../../components/StripePayment/PaymentForm";
import { triggerConfetti } from "../../utils/confetti";
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
  const navigate = useNavigate();

  const userRole = (user?.role || "").trim().toLowerCase();
  const isAdmin = userRole === "admin";
  const isDriver = userRole === "deliveryman";

  const [address, setAddress] = useState(user?.address || "");
  const [paymentMethod, setPaymentMethod] = useState("Cash"); // "Cash" or "Card"
  const [couponInput, setCouponInput] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

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
        paymentMethod: "Cash",
        couponCode: appliedCoupon?.code || "",
      };

      const res = await apiClient.post("/orders", orderPayload);
      triggerConfetti();
      toast.success("Order placed successfully with Cash on Delivery! 🍕🎉");
      clearCart();
      const orderId = res.data.orderId || res.data.order?._id;
      if (orderId) {
        navigate(`/orders/${orderId}`);
      } else {
        navigate("/orders");
      }
    } catch (err) {
      console.error("Order error:", err);
      toast.error(err.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
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

  if (cart.length === 0) {
    return (
      <div className="empty-cart-container">
        <div className="empty-cart-card">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your Cart is Empty</h2>
          <p>Explore our handcrafted menu and add delicious meals to your cart!</p>
          <button className="browse-menu-btn" onClick={() => navigate("/menu")}>
            Explore Delicious Menu ➔
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header-row">
        <h2>Your Shopping Cart 🛍️</h2>
        <button className="clear-cart-text-btn" onClick={clearCart}>
          Clear All Items
        </button>
      </div>

      {/* Free Delivery Bar */}
      <div className="free-shipping-card">
        <div className="free-shipping-text">
          {amountToFreeDelivery > 0 ? (
            <span>
              🚚 Add <strong>${amountToFreeDelivery.toFixed(2)}</strong> more to get <strong>FREE Delivery</strong>!
            </span>
          ) : (
            <span className="free-shipping-unlocked">
              🎉 Congratulations! You unlocked <strong>FREE Delivery</strong>!
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
            <h3 className="column-title">Order Items ({cart.length})</h3>

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
                    <p className="item-unit-price">${Number(item.price).toFixed(2)} each</p>
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
                      ${(item.price * item.quantity).toFixed(2)}
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
            <h3 className="column-title">Delivery & Instructions</h3>

            <div className="input-group">
              <label>Delivery Address *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, apartment or suite number, city..."
                rows={3}
                required
              />
            </div>

            <div className="input-group">
              <label>Special Cooking / Delivery Notes (Optional)</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Extra napkins, please ring the front doorbell..."
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
                <span>Items Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="free-badge">FREE</span>
                  ) : (
                    `$${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="summary-row discount-row">
                  <span>Promo Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="summary-row total-row">
                <span>Total Amount</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="payment-method-selector">
              <label className="payment-label">Select Payment Method</label>

              <div className="payment-options-grid">
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
                    <div className="option-title">Cash on Delivery</div>
                    <div className="option-sub">Pay at your doorstep</div>
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
                    <div className="option-title">Credit / Debit Card</div>
                    <div className="option-sub">Instant Stripe checkout</div>
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
                : paymentMethod === "Card"
                ? `Proceed to Card Payment • $${finalTotal.toFixed(2)}`
                : `Place Order (Cash) • $${finalTotal.toFixed(2)} ➔`}
            </button>

            <div className="checkout-trust-badges">
              <span>🔒 256-Bit SSL Encrypted</span>
              <span>⚡ Fast Delivery Guaranteed</span>
            </div>
          </div>
        </div>
      </div>

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
