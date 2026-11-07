import { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import { triggerConfetti } from "../../utils/confetti";
import "./EthiopianPaymentModal.css";

const PAYMENT_OPTIONS = [
  {
    id: "telebirr",
    methodKey: "Telebirr",
    name: "Telebirr",
    provider: "Ethio Telecom",
    merchantName: "Foodie Restaurant PLC",
    merchantCode: "554433",
    merchantPhone: "+251911223344",
    ussdCode: "*127#",
    instructions: "Pay via Telebirr SuperApp or dial *127# -> Pay Merchant -> Enter Code 554433",
    icon: "📱",
    color: "#0284c7",
    badge: "Official Ethio Telecom",
  },
  {
    id: "cbe",
    methodKey: "CBE",
    name: "Commercial Bank of Ethiopia (CBE)",
    provider: "Commercial Bank of Ethiopia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "1000234567891",
    shortCode: "998877",
    instructions: "Transfer to CBE Account 1000234567891 or use CBE Birr Shortcode 998877",
    icon: "🏦",
    color: "#7e22ce",
    badge: "CBE Birr & Mobile",
  },
  {
    id: "abyssinia",
    methodKey: "BankTransfer",
    name: "Bank of Abyssinia (BoA)",
    provider: "Bank of Abyssinia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "8877665544",
    instructions: "Transfer to BoA Account 8877665544 via BoA Mobile Banking App",
    icon: "🏛️",
    color: "#b45309",
    badge: "BoA Mobile",
  },
  {
    id: "awash",
    methodKey: "BankTransfer",
    name: "Awash Bank",
    provider: "Awash International Bank",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "01320492817200",
    instructions: "Transfer to Awash Account 01320492817200 via Awash Birr / Mobile Banking",
    icon: "🏦",
    color: "#059669",
    badge: "Awash Birr",
  },
];

const EthiopianPaymentModal = ({ amount, onPaymentSuccess, onCancel }) => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [selectedMethodId, setSelectedMethodId] = useState("telebirr");
  const [senderInfo, setSenderInfo] = useState("");
  const [refCode, setRefCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const activeOption = PAYMENT_OPTIONS.find((opt) => opt.id === selectedMethodId) || PAYMENT_OPTIONS[0];

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${t("copiedToClipboard")}`);
  };

  const handleGenerateSampleRef = () => {
    const prefix = activeOption.id === "telebirr" ? "TLB" : activeOption.id === "cbe" ? "CBE" : "ETB";
    const rand = Math.floor(10000000 + Math.random() * 90000000);
    const code = `${prefix}-${rand}`;
    setRefCode(code);
    toast.info(`Generated simulated reference code: ${code}`);
  };

  const handleVerifyPayment = async (e) => {
    e.preventDefault();

    if (!senderInfo.trim()) {
      toast.warning(t("enterSenderPhone"));
      return;
    }

    setVerifying(true);
    try {
      const res = await apiClient.post("/payments/ethiopian/process", {
        method: activeOption.id,
        amount: Number(amount),
        senderPhone: senderInfo.trim(),
        senderAccount: senderInfo.trim(),
        referenceCode: refCode.trim() || undefined,
      });

      triggerConfetti();
      toast.success(res.data.message || t("paymentConfirmed"));

      // Pass verified payment info back to caller
      onPaymentSuccess({
        method: activeOption.methodKey,
        provider: activeOption.name,
        accountNumber: activeOption.accountNumber || activeOption.merchantCode,
        transactionId: res.data.transactionId,
        amount: Number(amount),
        status: "Paid",
      });
    } catch (err) {
      console.error("Payment verification error:", err);
      toast.error(err.response?.data?.message || "Payment verification failed. Please check your transaction details.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="ethiopian-payment-modal-backdrop" onClick={onCancel}>
      <div className="ethiopian-payment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ethiopian-payment-header">
          <div className="header-title-box">
            <span className="flag-badge">🇪🇹 Ethiopian Instant Pay</span>
            <h3>{t("paymentMethod")}</h3>
          </div>
          <button className="modal-close-btn" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Amount to Pay Ribbon */}
        <div className="amount-banner">
          <span className="amount-banner-label">{t("amountToPay")}:</span>
          <strong className="amount-banner-value">{Number(amount).toFixed(2)} ETB</strong>
        </div>

        {/* Bank / Provider Tabs */}
        <div className="provider-tabs-row">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`provider-tab-btn ${selectedMethodId === opt.id ? "active" : ""}`}
              onClick={() => {
                setSelectedMethodId(opt.id);
                setRefCode("");
              }}
              style={{
                borderColor: selectedMethodId === opt.id ? opt.color : "transparent",
              }}
            >
              <span className="provider-icon">{opt.icon}</span>
              <div className="provider-tab-info">
                <strong>{opt.name.split(" ")[0]}</strong>
                <small>{opt.badge}</small>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Provider Box */}
        <div className="provider-detail-card" style={{ borderTop: `4px solid ${activeOption.color}` }}>
          <div className="detail-header-row">
            <div>
              <h4 style={{ color: activeOption.color }}>{activeOption.name}</h4>
              <p className="merchant-name-label">
                {t("merchantName")}: <strong>{activeOption.merchantName}</strong>
              </p>
            </div>
            <div className="provider-qr-badge">
              <span className="qr-icon">📱 Scan & Pay</span>
            </div>
          </div>

          <div className="account-details-grid">
            {activeOption.merchantCode && (
              <div className="detail-item">
                <span className="detail-label">{t("merchantCode")}</span>
                <div className="copyable-field">
                  <code>{activeOption.merchantCode}</code>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy(activeOption.merchantCode, t("merchantCode"))}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            )}

            {activeOption.accountNumber && (
              <div className="detail-item">
                <span className="detail-label">{t("merchantAccount")}</span>
                <div className="copyable-field">
                  <code>{activeOption.accountNumber}</code>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy(activeOption.accountNumber, t("merchantAccount"))}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            )}

            {activeOption.shortCode && (
              <div className="detail-item">
                <span className="detail-label">CBE Birr Shortcode</span>
                <div className="copyable-field">
                  <code>{activeOption.shortCode}</code>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy(activeOption.shortCode, "CBE Shortcode")}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            )}

            {activeOption.ussdCode && (
              <div className="detail-item">
                <span className="detail-label">{t("ussdCode")}</span>
                <div className="copyable-field">
                  <code>{activeOption.ussdCode}</code>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy(activeOption.ussdCode, "USSD")}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="instructions-callout">
            <span className="info-icon">ℹ️</span>
            <p>{activeOption.instructions}</p>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerifyPayment} className="verification-form">
          <div className="form-group">
            <label>{t("enterSenderPhone")} *</label>
            <input
              type="text"
              required
              value={senderInfo}
              onChange={(e) => setSenderInfo(e.target.value)}
              placeholder="e.g. 0911234567 or account number"
              className="pay-input"
            />
          </div>

          <div className="form-group">
            <div className="ref-label-row">
              <label>{t("enterTransactionRef")}</label>
              <button
                type="button"
                className="auto-gen-ref-btn"
                onClick={handleGenerateSampleRef}
              >
                ⚡ Generate Official Ref
              </button>
            </div>
            <input
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value)}
              placeholder="e.g. TLB-98341209 or SMS Ref"
              className="pay-input"
            />
            <small className="field-hint">
              Enter the transaction number from your Telebirr / CBE confirmation SMS, or click 'Generate Official Ref' to simulate.
            </small>
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" onClick={onCancel} disabled={verifying}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-verify"
              disabled={verifying}
              style={{ backgroundColor: activeOption.color }}
            >
              {verifying ? "Verifying Payment..." : `${t("verifyAndPlaceOrder")}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EthiopianPaymentModal;
