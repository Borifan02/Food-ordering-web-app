import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import apiClient from "../../api/axios";
import { triggerConfetti } from "../../utils/confetti";
import { useLanguage } from "../../context/LanguageContext";
import "./PaymentCallback.css";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const status = searchParams.get("status") || "pending";
  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");
  const txRef = searchParams.get("tx_ref");
  const message = searchParams.get("message");

  const [verifying, setVerifying] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [countdown, setCountdown] = useState(6);

  const isSuccess = status === "success" || status === "completed";

  useEffect(() => {
    if (sessionId) {
      verifySession();
    } else {
      setVerifying(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      if (orderId) {
        navigate(`/orders/${orderId}`);
      } else {
        navigate("/orders");
      }
    }
  }, [isSuccess, countdown, orderId, navigate]);

  const verifySession = async () => {
    try {
      const res = await apiClient.get(`/payments/gateway/verify/${sessionId}`);
      setVerificationData(res.data);
      if (res.data.sessionStatus === "SUCCESS" || res.data.paymentStatus === "Paid") {
        triggerConfetti();
      }
    } catch (err) {
      console.error("Callback verification error:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (verifying) {
    return (
      <div className="callback-page-container">
        <div className="callback-card loading-card">
          <div className="callback-spinner"></div>
          <h3>Verifying Transaction with Gateway...</h3>
          <p>Please wait while we confirm your payment with the bank network.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="callback-page-container">
      {isSuccess ? (
        <div className="callback-card success-card">
          <div className="callback-icon success-icon">✓</div>
          <h2>Payment Successfully Verified! 🎉</h2>
          <p className="callback-subtitle">
            Your Ethiopian mobile money payment has been authenticated and confirmed.
          </p>

          {/* Official Tax & Order Receipt */}
          <div className="callback-receipt-box" id="printable-callback-receipt">
            <div className="receipt-brand-title">Foodie Restaurant PLC</div>
            <div className="receipt-tin-num">TIN: 0099887766 • Addis Ababa, Ethiopia</div>
            <div className="receipt-tagline">Official Digital Payment Receipt</div>

            <div className="receipt-rows-list">
              <div className="receipt-line">
                <span>Order Reference:</span>
                <strong>#{String(orderId).slice(-8)}</strong>
              </div>
              <div className="receipt-line">
                <span>Gateway Session ID:</span>
                <code>{sessionId}</code>
              </div>
              <div className="receipt-line">
                <span>Payment Method:</span>
                <strong>{verificationData?.provider || "Telebirr / CBE"}</strong>
              </div>
              <div className="receipt-line">
                <span>Transaction Ref:</span>
                <strong className="receipt-tx-code">
                  {txRef || verificationData?.transactionId || "TLB-CONFIRMED"}
                </strong>
              </div>
              <div className="receipt-line">
                <span>Amount Paid:</span>
                <strong className="receipt-amount-text">
                  {Number(verificationData?.amount || 0).toFixed(2)} ETB
                </strong>
              </div>
              <div className="receipt-line">
                <span>Verification Time:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="auto-redirect-note">
            Auto-directing to live order tracking in <strong>{countdown}s</strong>...
          </div>

          <div className="callback-actions-row">
            <button className="callback-btn secondary" onClick={handlePrint}>
              🖨️ Print Receipt
            </button>
            <button
              className="callback-btn primary"
              onClick={() => navigate(orderId ? `/orders/${orderId}` : "/orders")}
            >
              Track Order Live ➔
            </button>
          </div>
        </div>
      ) : (
        <div className="callback-card failure-card">
          <div className="callback-icon failure-icon">✕</div>
          <h2>Payment Not Completed</h2>
          <p className="callback-subtitle">
            {message || "The payment transaction was cancelled or declined by the gateway."}
          </p>

          <div className="callback-order-ref-note">
            {orderId && (
              <span>
                Your order <strong>#{orderId.slice(-6)}</strong> is saved with 'Payment Pending'.
              </span>
            )}
          </div>

          <div className="callback-actions-row">
            <button className="callback-btn secondary" onClick={() => navigate("/cart")}>
              Return to Cart
            </button>
            {orderId && (
              <button
                className="callback-btn primary"
                onClick={() => navigate(`/orders/${orderId}`)}
              >
                Go to Order Details ➔
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCallback;
