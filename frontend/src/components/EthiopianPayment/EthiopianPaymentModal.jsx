import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { triggerConfetti } from "../../utils/confetti";
import { isEthiopianPhone, ETHIOPIAN_PHONE_PLACEHOLDER } from "../../utils/phone";
import apiClient from "../../api/axios";
import "./EthiopianPaymentModal.css";

const PAYMENT_OPTIONS = [
  {
    id: "telebirr",
    methodKey: "Telebirr",
    name: "Telebirr (Ethio Telecom)",
    shortName: "Telebirr",
    provider: "Ethio Telecom",
    merchantName: "Foodie Restaurant PLC",
    merchantCode: "554433",
    merchantPhone: "+251911223344",
    ussdCode: "*127#",
    ussdDial: "*127#",
    instructions: [
      "Open your Telebirr App or dial *127# on your mobile phone",
      "Select 'Pay Merchant' or 'Send Money'",
      "Enter Restaurant Merchant Code: 554433",
      "Confirm amount and enter your Telebirr PIN",
      "Copy the Transaction Reference number from the Ethio Telecom SMS confirmation",
    ],
    refPlaceholder: "e.g., TLB-20268492 or 10-digit SMS code",
    icon: "📱",
    color: "#0284c7",
    badge: "Official Ethio Telecom Merchant",
  },
  {
    id: "cbe",
    methodKey: "CBE",
    name: "Commercial Bank of Ethiopia (CBE)",
    shortName: "CBE Birr & Mobile",
    provider: "Commercial Bank of Ethiopia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "1000234567891",
    shortCode: "998877",
    ussdCode: "*847#",
    ussdDial: "*847#",
    instructions: [
      "Open CBE Mobile Banking App or dial *847#",
      "Transfer to Account 1000234567891 or CBE Birr Shortcode 998877",
      "Recipient Name will show: Foodie Restaurant PLC",
      "Confirm transfer and save your bank transaction reference",
      "Enter the CBE confirmation code below to verify your order",
    ],
    refPlaceholder: "e.g., FT260198471 or CBE SMS Transaction ID",
    icon: "🏦",
    color: "#7e22ce",
    badge: "CBE Birr & CBE Mobile",
  },
  {
    id: "abyssinia",
    methodKey: "BankTransfer",
    name: "Bank of Abyssinia (BoA)",
    shortName: "BoA Mobile",
    provider: "Bank of Abyssinia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "8877665544",
    ussdCode: "*815#",
    ussdDial: "*815#",
    instructions: [
      "Open BoA Mobile Banking App (Apollo) or dial *815#",
      "Select Transfer -> To BoA Account",
      "Enter Account: 8877665544 (Foodie Restaurant PLC)",
      "Enter total order amount in ETB",
      "Copy your BoA confirmation reference number below",
    ],
    refPlaceholder: "e.g., BOA-9810294 or BoA Reference",
    icon: "🏛️",
    color: "#b45309",
    badge: "BoA Mobile Banking",
  },
  {
    id: "awash",
    methodKey: "BankTransfer",
    name: "Awash Bank (Awash Birr)",
    shortName: "Awash Birr",
    provider: "Awash International Bank",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "01320492817200",
    ussdCode: "*901#",
    ussdDial: "*901#",
    instructions: [
      "Open Awash Birr App or dial *901#",
      "Transfer to Awash Account: 01320492817200",
      "Verify merchant name: Foodie Restaurant PLC",
      "Complete transfer and enter your transaction reference below",
    ],
    refPlaceholder: "e.g., AWSH-7482910 or Awash Reference",
    icon: "🏦",
    color: "#059669",
    badge: "Awash Birr",
  },
];

const EthiopianPaymentModal = ({
  orderId,
  amount,
  onPaymentSuccess,
  onCancel,
}) => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const { toast } = useToast();

  const [selectedMethodId, setSelectedMethodId] = useState("telebirr");
  const [senderPhone, setSenderPhone] = useState(user?.phone || "");
  const [referenceCode, setReferenceCode] = useState("");
  const [notes, setNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedReceipt, setVerifiedReceipt] = useState(null);

  useEffect(() => {
    if (user?.phone && !senderPhone) {
      setSenderPhone(user.phone);
    }
  }, [user]);

  const activeOption =
    PAYMENT_OPTIONS.find((opt) => opt.id === selectedMethodId) ||
    PAYMENT_OPTIONS[0];

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${t("copiedToClipboard")}`);
  };

  const handleVerifyPayment = async (e) => {
    e.preventDefault();

    if (!referenceCode.trim()) {
      toast.warning("Please enter your bank or Telebirr SMS transaction reference number.");
      return;
    }

    if (referenceCode.trim().length < 5) {
      toast.warning("Transaction reference code must be at least 5 characters long.");
      return;
    }

    if (senderPhone && !isEthiopianPhone(senderPhone.trim())) {
      toast.warning("Please enter a valid Ethiopian mobile number (e.g. 0911223344 or +251 911223344).");
      return;
    }

    setVerifying(true);
    try {
      const res = await apiClient.post("/payments/verify-reference", {
        orderId,
        method: activeOption.id,
        referenceCode: referenceCode.trim().toUpperCase(),
        senderPhone: senderPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      triggerConfetti();
      toast.success(res.data.message || t("paymentConfirmed"));

      const receiptData = res.data.receipt || {
        receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
        orderId,
        amount: Number(amount).toFixed(2),
        currency: "ETB",
        provider: activeOption.name,
        merchantName: activeOption.merchantName,
        transactionId: referenceCode.trim().toUpperCase(),
        senderPhone: senderPhone.trim(),
        paidAt: new Date(),
        status: "Paid",
      };

      setVerifiedReceipt(receiptData);

      if (onPaymentSuccess) {
        onPaymentSuccess({
          orderId,
          method: activeOption.methodKey,
          provider: activeOption.name,
          transactionId: referenceCode.trim().toUpperCase(),
          status: "Paid",
          amount: Number(amount),
          receipt: receiptData,
        });
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      toast.error(
        err.response?.data?.message ||
          "Payment verification failed. Please verify your reference number and try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="ethiopian-payment-modal-backdrop" onClick={onCancel}>
      <div
        className="ethiopian-payment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="ethiopian-payment-header">
          <div className="header-title-box">
            <span className="flag-badge">🇪🇹 {t("ethiopianInstantPay")}</span>
            <h3>{t("paymentMethod")}</h3>
          </div>
          <button
            className="modal-close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* If payment already verified, show Official Digital Receipt */}
        {verifiedReceipt ? (
          <div className="receipt-view-card">
            <div className="receipt-success-badge">
              <span className="check-icon">✓</span>
              <h4>{t("paymentStatusPaid")}</h4>
              <p>Your payment has been recorded and verified on the restaurant ledger.</p>
            </div>

            <div className="official-receipt-sheet" id="printable-receipt">
              <div className="receipt-header">
                <div className="restaurant-brand">Foodie Restaurant PLC</div>
                <div className="receipt-tin">
                  {t("merchantTin")}: <strong>0099887766</strong>
                </div>
                <div className="receipt-type">{t("digitalReceipt")}</div>
              </div>

              <div className="receipt-details-grid">
                <div className="receipt-row">
                  <span>{t("receiptNumber")}:</span>
                  <strong>{verifiedReceipt.receiptNumber}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t("orderRef")}:</span>
                  <strong>#{String(orderId).substring(0, 10)}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t("paymentMethod")}:</span>
                  <strong>{verifiedReceipt.provider}</strong>
                </div>
                <div className="receipt-row">
                  <span>{t("transactionRef")}:</span>
                  <strong className="receipt-code-highlight">
                    {verifiedReceipt.transactionId}
                  </strong>
                </div>
                {verifiedReceipt.senderPhone && (
                  <div className="receipt-row">
                    <span>{t("senderPhoneLabel")}:</span>
                    <span>{verifiedReceipt.senderPhone}</span>
                  </div>
                )}
                <div className="receipt-row">
                  <span>{t("orderDate")}:</span>
                  <span>
                    {new Date(verifiedReceipt.paidAt || Date.now()).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="receipt-row receipt-total-row">
                  <span>{t("totalAmount")}:</span>
                  <span className="receipt-total-val">
                    {Number(amount).toFixed(2)} ETB
                  </span>
                </div>
              </div>

              <div className="receipt-footer">
                <p>Thank you for choosing Foodie! 🇪🇹 Addis Ababa, Ethiopia</p>
              </div>
            </div>

            <div className="receipt-actions">
              <button
                type="button"
                className="btn-print-receipt"
                onClick={handlePrintReceipt}
              >
                🖨️ {t("printReceipt")}
              </button>
              <button
                type="button"
                className="btn-go-tracking"
                onClick={() => {
                  if (onPaymentSuccess) {
                    onPaymentSuccess({
                      orderId,
                      method: activeOption.methodKey,
                      provider: activeOption.name,
                      transactionId: verifiedReceipt.transactionId,
                      status: "Paid",
                      amount: Number(amount),
                    });
                  }
                }}
              >
                {t("trackLiveOrder")} ➔
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Amount to Pay Ribbon */}
            <div className="amount-banner">
              <div className="amount-banner-meta">
                <span className="order-context-id">
                  {t("orderRef")}: <strong>#{String(orderId).substring(0, 8)}</strong>
                </span>
                <span className="official-merchant-pill">
                  ✓ {t("officialMerchant")}
                </span>
              </div>
              <div className="amount-banner-price">
                <span className="amount-banner-label">{t("amountToPay")}:</span>
                <strong className="amount-banner-value">
                  {Number(amount).toFixed(2)} ETB
                </strong>
              </div>
            </div>

            {/* Provider Tabs */}
            <div className="provider-tabs-row">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`provider-tab-btn ${
                    selectedMethodId === opt.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedMethodId(opt.id)}
                >
                  <span className="tab-icon">{opt.icon}</span>
                  <span className="tab-label">{opt.shortName}</span>
                </button>
              ))}
            </div>

            {/* Merchant Account Details Box */}
            <div className="merchant-details-card">
              <div className="merchant-card-top">
                <div className="merchant-title-wrap">
                  <span className="provider-icon">{activeOption.icon}</span>
                  <div>
                    <h4>{activeOption.name}</h4>
                    <span className="merchant-verified-tag">
                      {activeOption.badge}
                    </span>
                  </div>
                </div>

                <div className="merchant-name-pill">
                  {activeOption.merchantName}
                </div>
              </div>

              {/* Account / Short Code row */}
              <div className="account-number-display">
                <div className="account-number-group">
                  <span className="account-field-label">
                    {activeOption.id === "telebirr"
                      ? "Merchant Short Code"
                      : "Account Number / Shortcode"}
                  </span>
                  <strong className="account-code-value">
                    {activeOption.merchantCode || activeOption.accountNumber}
                  </strong>
                </div>

                <button
                  type="button"
                  className="copy-account-btn"
                  onClick={() =>
                    handleCopy(
                      activeOption.merchantCode || activeOption.accountNumber,
                      activeOption.shortName
                    )
                  }
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              </div>

              {/* Quick Actions Bar (USSD Quick Dial + Amount) */}
              <div className="merchant-quick-actions">
                {activeOption.ussdDial && (
                  <a
                    href={`tel:${activeOption.ussdDial.replace("#", "%23")}`}
                    className="ussd-dial-btn"
                  >
                    📞 {t("dialUssd")} ({activeOption.ussdCode})
                  </a>
                )}
                <div className="exact-amount-pill">
                  Exact Amount: <strong>{Number(amount).toFixed(2)} ETB</strong>
                </div>
              </div>

              {/* Step by Step Instructions */}
              <div className="transfer-instructions-box">
                <h5>{t("instructions")}:</h5>
                <ol className="instructions-list">
                  {activeOption.instructions.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* SMS Verification Form */}
            <form onSubmit={handleVerifyPayment} className="verification-form">
              <div className="form-group-payment">
                <label>
                  {t("senderPhoneLabel")} (+251) *
                </label>
                <input
                  type="tel"
                  placeholder={ETHIOPIAN_PHONE_PLACEHOLDER}
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-payment">
                <label>
                  {t("transactionRef")} *
                </label>
                <input
                  type="text"
                  placeholder={activeOption.refPlaceholder}
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  className="input-ref-code"
                  required
                />
                <span className="field-hint">
                  {t("enterTransactionRefHelp")}
                </span>
              </div>

              <div className="form-group-payment">
                <label>Optional Transfer Note</label>
                <input
                  type="text"
                  placeholder="e.g., Dinner order Bole"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="verification-form-actions">
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={onCancel}
                  disabled={verifying}
                >
                  {t("cancel")}
                </button>

                <button
                  type="submit"
                  className="btn-submit-verification"
                  disabled={verifying}
                >
                  {verifying ? (
                    <span className="verifying-spinner">
                      ⏳ {t("verifyingPayment")}
                    </span>
                  ) : (
                    `✓ ${t("verifyPaymentBtn")}`
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default EthiopianPaymentModal;
