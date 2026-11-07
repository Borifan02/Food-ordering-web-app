import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import "./MockPaymentGateway.css";

const MockPaymentGateway = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerPin, setCustomerPin] = useState("1234");
  const [otpCode, setOtpCode] = useState("892014");
  const [processing, setProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState("");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/payments/gateway/session/${sessionId}`);
      setSession(res.data.session);
      setOrderItems(res.data.orderItems || []);
      setCustomerPhone(res.data.session?.customerPhone || "0911223344");
    } catch (err) {
      console.error("Error loading gateway session:", err);
      setError(err.response?.data?.message || "Payment session not found or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType) => {
    setProcessing(true);
    setProcessingAction(actionType);
    try {
      const res = await apiClient.post("/payments/gateway/mock-process", {
        sessionId,
        action: actionType,
        customerPin,
        otpCode,
        customerPhone,
      });

      if (res.data.redirectUrl) {
        // Parse and navigate internally or via window.location
        try {
          const urlObj = new URL(res.data.redirectUrl, window.location.origin);
          if (urlObj.origin === window.location.origin) {
            navigate(`${urlObj.pathname}${urlObj.search}`);
          } else {
            window.location.href = res.data.redirectUrl;
          }
        } catch {
          window.location.href = res.data.redirectUrl;
        }
      }
    } catch (err) {
      console.error("Gateway execution error:", err);
      toast.error(err.response?.data?.message || "Gateway processing error occurred");
      setProcessing(false);
      setProcessingAction("");
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="gateway-portal-backdrop">
        <div className="gateway-loading-box">
          <div className="gateway-spinner"></div>
          <p>Connecting to Ethiopian Mobile Money Payment Gateway...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="gateway-portal-backdrop">
        <div className="gateway-card error-card">
          <div className="gateway-error-icon">⚠️</div>
          <h3>Payment Gateway Session Error</h3>
          <p>{error || "The requested payment session is invalid or has expired."}</p>
          <button className="gateway-btn secondary" onClick={() => navigate("/cart")}>
            Return to Cart
          </button>
        </div>
      </div>
    );
  }

  const isTelebirr = session.paymentMethod === "Telebirr";
  const brandTitle = isTelebirr ? "Telebirr SuperApp Web Checkout" : "CBE Birr Online Payment Portal";
  const brandThemeClass = isTelebirr ? "theme-telebirr" : "theme-cbe";

  return (
    <div className="gateway-portal-backdrop">
      <div className={`gateway-card ${brandThemeClass}`}>
        {/* Gateway Brand Header */}
        <div className="gateway-header">
          <div className="gateway-brand-badge">
            <span className="gateway-brand-logo">{isTelebirr ? "📱" : "🏦"}</span>
            <div>
              <h2>{brandTitle}</h2>
              <span className="gateway-ssl-tag">🔒 256-Bit SSL Encrypted • NBE Licensed</span>
            </div>
          </div>

          <div className="gateway-timer-badge" title="Session Timeout">
            ⏱️ {formatTimer(timeLeft)}
          </div>
        </div>

        {/* Sandbox Simulation Notice Banner */}
        <div className="gateway-sandbox-banner">
          <span className="sandbox-chip">SANDBOX MOCK API GATEWAY</span>
          <p>
            Real Gateway Architecture Active. Ready for testing. In live production, this connects directly to the Ethio Telecom / CBE server.
          </p>
        </div>

        {/* Order Details Ribbon */}
        <div className="gateway-order-summary">
          <div className="summary-left">
            <span className="summary-label">Merchant</span>
            <strong>{session.merchantName}</strong>
            {isTelebirr ? (
              <span className="merchant-code-text">
                Telebirr Short Code: <strong>554433</strong> • Phone: <strong>+251 911 223 344</strong>
              </span>
            ) : (
              <span className="merchant-code-text">
                CBE Account: <strong>1000234567891</strong> • CBE Birr Code: <strong>998877</strong>
              </span>
            )}
          </div>

          <div className="summary-right">
            <span className="summary-label">Amount Due</span>
            <strong className="summary-amount-value">
              {Number(session.amount).toFixed(2)} ETB
            </strong>
          </div>
        </div>

        {/* Order Items List */}
        {orderItems && orderItems.length > 0 && (
          <div className="gateway-order-items-box">
            <span className="gateway-items-title">🛍️ Order Dishes ({orderItems.length})</span>
            <div className="gateway-items-list">
              {orderItems.map((item, idx) => (
                <div key={idx} className="gateway-item-row">
                  <span>{item.quantity}x {item.name}</span>
                  <strong>{(item.price * item.quantity).toFixed(2)} ETB</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Authentication Simulation Form */}
        <div className="gateway-auth-box">
          <div className="auth-field-group">
            <label>Customer Mobile Number (+251)</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="gateway-input"
              placeholder="0911223344"
            />
          </div>

          <div className="auth-field-row">
            <div className="auth-field-group">
              <label>Telebirr / CBE 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={customerPin}
                onChange={(e) => setCustomerPin(e.target.value)}
                className="gateway-input pin-input"
                placeholder="****"
              />
            </div>

            <div className="auth-field-group">
              <label>6-Digit SMS OTP Code</label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="gateway-input otp-input"
                placeholder="892014"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons for Testing All Gateway Scenarios */}
        <div className="gateway-actions-group">
          <button
            type="button"
            className="gateway-btn primary btn-authorize"
            onClick={() => handleAction("confirm")}
            disabled={processing}
          >
            {processing && processingAction === "confirm" ? (
              <span>⏳ Authorizing Payment with Bank...</span>
            ) : (
              `✓ Authorize Payment (${Number(session.amount).toFixed(2)} ETB)`
            )}
          </button>

          <div className="gateway-aux-actions">
            <button
              type="button"
              className="gateway-btn warning btn-simulate-fail"
              onClick={() => handleAction("fail")}
              disabled={processing}
            >
              {processing && processingAction === "fail"
                ? "Simulating Decline..."
                : "Simulate Decline (Wrong PIN / Low Balance)"}
            </button>

            <button
              type="button"
              className="gateway-btn danger btn-cancel"
              onClick={() => handleAction("cancel")}
              disabled={processing}
            >
              Cancel Transaction ✕
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="gateway-footer">
          <p>
            Secure Mobile Money Transaction Processing for Foodie Restaurant PLC • Addis Ababa, Ethiopia
          </p>
        </div>
      </div>
    </div>
  );
};

export default MockPaymentGateway;
