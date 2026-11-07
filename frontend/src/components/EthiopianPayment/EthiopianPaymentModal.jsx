import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { triggerConfetti } from "../../utils/confetti";
import { isEthiopianPhone, ETHIOPIAN_PHONE_PLACEHOLDER } from "../../utils/phone";
import apiClient from "../../api/axios";
import "./EthiopianPaymentModal.css";

const PAYMENT_METHODS_DATA = {
  telebirr: {
    id: "telebirr",
    methodKey: "Telebirr",
    title: "Telebirr",
    titleAm: "ቴሌብር",
    titleOm: "Telebirr",
    subtitle: "Ethio Telecom Mobile Money",
    subtitleAm: "የኢትዮ ቴሌኮም የሞባይል ክፍያ",
    subtitleOm: "Kaffaltii Moobaayilaa Ityoo Teelekoom",
    icon: "📱",
    color: "#0072ce",
    badge: "Official Merchant",
    badgeAm: "ይፋዊ ነጋዴ",
    badgeOm: "Daldalaa Eeyyamamaa",
    merchantName: "Foodie Restaurant PLC",
    merchantCode: "554433",
    merchantPhone: "+251911223344",
    ussdCode: "*127#",
    ussdDial: "*127#",
    refPlaceholder: "e.g. TLB20268492 or 10-digit SMS code",
  },
  cbe: {
    id: "cbe",
    methodKey: "CBE",
    title: "Commercial Bank of Ethiopia",
    titleAm: "የኢትዮጵያ ንግድ ባንክ (CBE Birr)",
    titleOm: "Baankii Daldala Itoophiyaa (CBE)",
    subtitle: "CBE Birr & Mobile Banking",
    subtitleAm: "ሲቢኢ ብር እና ሞባይል ባንኪንግ",
    subtitleOm: "CBE Birr & Baankii Moobaayilaa",
    icon: "🏦",
    color: "#6b21a8",
    badge: "Verified Account",
    badgeAm: "የተረጋገጠ ሂሳብ",
    badgeOm: "Herrega Mirkanaa'e",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "1000234567891",
    shortCode: "998877",
    ussdCode: "*847#",
    ussdDial: "*847#",
    refPlaceholder: "e.g. FT260198471 or CBE SMS Transaction ID",
  },
  abyssinia: {
    id: "abyssinia",
    methodKey: "BankTransfer",
    title: "Bank of Abyssinia",
    titleAm: "የአቢሲኒያ ባንክ",
    titleOm: "Baankii Abisiiniyaa",
    subtitle: "BoA Mobile Banking (Apollo)",
    subtitleAm: "አፖሎ ሞባይል ባንኪንግ",
    subtitleOm: "Apollo Moobaayilaa",
    icon: "🏛️",
    color: "#b45309",
    badge: "Direct Transfer",
    badgeAm: "ቀጥታ ማስተላለፊያ",
    badgeOm: "Dabarsa Kallattii",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "8877665544",
    ussdCode: "*815#",
    ussdDial: "*815#",
    refPlaceholder: "e.g. BOA-9810294 or BoA Reference",
  },
};

const resolveMethodKey = (method) => {
  if (!method) return "telebirr";
  const clean = String(method).toLowerCase();
  if (clean === "cbe" || clean.includes("cbe")) return "cbe";
  if (clean.includes("abyssinia") || clean.includes("bank")) return "abyssinia";
  return "telebirr";
};

const EthiopianPaymentModal = ({
  orderId,
  amount,
  initialMethod = "Telebirr",
  orderItems = [],
  onPaymentSuccess,
  onCancel,
}) => {
  const { user } = useContext(AuthContext);
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeMethodId, setActiveMethodId] = useState(() => resolveMethodKey(initialMethod));
  const [step, setStep] = useState("prompt"); // "prompt" | "pin" | "success"
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "0911223344");
  const [customerPin, setCustomerPin] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [showManualSection, setShowManualSection] = useState(false);
  const [manualRefCode, setManualRefCode] = useState("");
  const [verifyingManual, setVerifyingManual] = useState(false);
  const [gatewaySession, setGatewaySession] = useState(null);
  const [completedPayment, setCompletedPayment] = useState(null);

  useEffect(() => {
    if (initialMethod) {
      setActiveMethodId(resolveMethodKey(initialMethod));
    }
  }, [initialMethod]);

  useEffect(() => {
    if (user?.phone && (!customerPhone || customerPhone === "0911223344")) {
      setCustomerPhone(user.phone);
    }
  }, [user]);

  const activeMethod = PAYMENT_METHODS_DATA[activeMethodId] || PAYMENT_METHODS_DATA.telebirr;
  const isTelebirr = activeMethod.id === "telebirr";
  const isCbe = activeMethod.id === "cbe";

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${t("copiedToClipboard") || "copied to clipboard!"}`);
  };

  // Step 1: User clicks "Pay with Telebirr / CBE" -> Initialize session & show PIN prompt
  const handleInitiatePayment = async () => {
    if (!customerPhone.trim()) {
      toast.warning("Please enter your mobile phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/payments/gateway/session", {
        orderId,
        paymentMethod: activeMethod.methodKey,
      });

      // If live external gateway URL is returned (e.g. Chapa live gateway)
      const checkoutUrl = res.data?.checkoutUrl;
      if (
        checkoutUrl &&
        (checkoutUrl.startsWith("http://") || checkoutUrl.startsWith("https://")) &&
        !checkoutUrl.includes(window.location.host)
      ) {
        window.location.href = checkoutUrl;
        return;
      }

      setGatewaySession(res.data);
      setStep("pin");
    } catch (err) {
      console.error("Session creation error:", err);
      toast.warning("Could not connect to online gateway. Please use the direct account transfer below.");
      setShowManualSection(true);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User confirms with 4-Digit PIN -> Authorize payment
  const handleAuthorizePayment = async () => {
    if (!customerPin || customerPin.length < 4) {
      toast.warning("Please enter your 4-digit PIN");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/payments/gateway/mock-process", {
        sessionId: gatewaySession?.sessionId,
        action: "confirm",
        customerPin,
        customerPhone: customerPhone.trim(),
      });

      triggerConfetti();
      toast.success(t("paymentConfirmed") || "Payment verified successfully! 🎉");

      const paymentResult = {
        orderId,
        method: activeMethod.methodKey,
        provider: activeMethod.title,
        transactionId: res.data.transactionReference,
        status: "Paid",
        amount: Number(amount),
        paidAt: new Date(),
        receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
      };

      setCompletedPayment(paymentResult);
      setStep("success");

      if (onPaymentSuccess) {
        onPaymentSuccess(paymentResult);
      }
    } catch (err) {
      console.error("Authorization error:", err);
      toast.error(err.response?.data?.message || "Payment authorization failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Manual Transfer Verification: Customer transferred via USSD / Mobile App
  const handleVerifyManualReference = async (e) => {
    if (e) e.preventDefault();
    if (!manualRefCode.trim()) {
      toast.warning("Please enter your transaction reference code");
      return;
    }

    setVerifyingManual(true);
    try {
      const res = await apiClient.post("/payments/verify-reference", {
        orderId,
        method: activeMethod.id,
        referenceCode: manualRefCode.trim().toUpperCase(),
        senderPhone: customerPhone.trim() || undefined,
      });

      triggerConfetti();
      toast.success(res.data.message || "Payment verified successfully! 🎉");

      const paymentResult = {
        orderId,
        method: activeMethod.methodKey,
        provider: activeMethod.title,
        transactionId: manualRefCode.trim().toUpperCase(),
        status: "Paid",
        amount: Number(amount),
        paidAt: new Date(),
        receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
      };

      setCompletedPayment(paymentResult);
      setStep("success");

      if (onPaymentSuccess) {
        onPaymentSuccess(paymentResult);
      }
    } catch (err) {
      console.error("Manual verification error:", err);
      toast.error(
        err.response?.data?.message ||
          "Could not verify transaction reference. Please double-check your SMS code."
      );
    } finally {
      setVerifyingManual(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const localizedTitle =
    language === "am" && activeMethod.titleAm
      ? activeMethod.titleAm
      : language === "om" && activeMethod.titleOm
        ? activeMethod.titleOm
        : activeMethod.title;

  const localizedSubtitle =
    language === "am" && activeMethod.subtitleAm
      ? activeMethod.subtitleAm
      : language === "om" && activeMethod.subtitleOm
        ? activeMethod.subtitleOm
        : activeMethod.subtitle;

  const localizedBadge =
    language === "am" && activeMethod.badgeAm
      ? activeMethod.badgeAm
      : language === "om" && activeMethod.badgeOm
        ? activeMethod.badgeOm
        : activeMethod.badge;

  return (
    <div className="ethiopian-payment-modal-backdrop" onClick={onCancel}>
      <div
        className={`ethiopian-payment-sheet ${isTelebirr ? "theme-telebirr" : isCbe ? "theme-cbe" : "theme-default"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Modal Header */}
        <div className="sheet-header">
          <div className="sheet-brand-group">
            <span className="sheet-brand-icon">{activeMethod.icon}</span>
            <div>
              <div className="sheet-brand-title">
                {localizedTitle}
                <span className="sheet-verified-pill">✓ {localizedBadge}</span>
              </div>
              <div className="sheet-brand-sub">{localizedSubtitle}</div>
            </div>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Order Amount Banner */}
        <div className="sheet-amount-banner">
          <div className="amount-label-wrap">
            <span className="amount-caption">{t("amountToPay") || "Amount to Pay"}</span>
            <div className="amount-headline">{Number(amount).toFixed(2)} ETB</div>
          </div>
          <div className="amount-order-meta">
            <span className="order-pill">Order #{String(orderId).slice(-6)}</span>
            {orderItems && orderItems.length > 0 && (
              <span className="items-pill">{orderItems.length} items</span>
            )}
          </div>
        </div>

        {/* Modal Body: Switch between Prompt, PIN, and Success */}
        <div className="sheet-body">
          {/* STEP 3: PAYMENT SUCCESS & DIGITAL RECEIPT */}
          {step === "success" && completedPayment && (
            <div className="sheet-success-view">
              <div className="success-icon-wrap">
                <span className="success-checkmark">✓</span>
              </div>

              <h3 className="success-heading">
                {language === "am" ? "ክፍያው በተሳካ ሁኔታ ተፈጽሟል!" : language === "om" ? "Kaffaltiin Milkaa'inaan Xumurameera!" : "Payment Confirmed!"}
              </h3>
              <p className="success-subheading">
                {language === "am"
                  ? "የትዕዛዝዎ ክፍያ ተረጋግጧል፤ ወጥ ቤቱ ምግብዎን በማዘጋጀት ላይ ይገኛል።"
                  : language === "om"
                    ? "Kaffaltiin keessan mirkanaa'eera; manni nyaataa qopheessaa jira."
                    : "Your payment has been verified. The kitchen has received your order."}
              </p>

              {/* Printable Official Ethiopian Voucher */}
              <div className="sheet-receipt-card" id="printable-receipt">
                <div className="receipt-brand-row">
                  <strong>Foodie Restaurant PLC</strong>
                  <span className="receipt-tag">Digital Receipt</span>
                </div>
                <div className="receipt-line">
                  <span>Order Number</span>
                  <strong>#{String(orderId).slice(-8)}</strong>
                </div>
                <div className="receipt-line">
                  <span>Transaction ID</span>
                  <strong className="receipt-tx-code">{completedPayment.transactionId}</strong>
                </div>
                <div className="receipt-line">
                  <span>Payment Method</span>
                  <span>{completedPayment.provider}</span>
                </div>
                <div className="receipt-line">
                  <span>Status</span>
                  <span className="receipt-status-paid">Paid ✓</span>
                </div>
                <div className="receipt-divider"></div>
                <div className="receipt-total-line">
                  <span>Total Paid</span>
                  <strong>{Number(amount).toFixed(2)} ETB</strong>
                </div>
              </div>

              <div className="sheet-success-actions">
                <button
                  type="button"
                  className="sheet-btn primary btn-track-order"
                  onClick={() => {
                    navigate(`/orders/${orderId}`);
                  }}
                >
                  {t("trackLiveOrder") || "Track Live Order"} ➔
                </button>
                <button
                  type="button"
                  className="sheet-btn secondary btn-print-receipt"
                  onClick={handlePrintReceipt}
                >
                  🖨️ {t("printReceipt") || "Print Receipt"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ENTER PIN TO AUTHORIZE */}
          {step === "pin" && (
            <div className="sheet-pin-view">
              <div className="pin-prompt-box">
                <div className="pin-security-badge">
                  <span>🔒 Secure Authorization</span>
                </div>
                <h4>
                  {language === "am"
                    ? `የ${activeMethod.title} 4-አሃዝ ሚስጥር ቁጥርዎን ያስገቡ`
                    : language === "om"
                      ? `Koodii PIN ${activeMethod.title} keessan galchaa`
                      : `Enter your 4-Digit ${activeMethod.title} PIN`}
                </h4>
                <p>
                  {language === "am"
                    ? `የ ${Number(amount).toFixed(2)} ብር ክፍያን ለማረጋገጥ ወደ ስልክዎ የተላከውን የፍቃድ ቁጥር ያረጋግጡ።`
                    : language === "om"
                      ? `Kaffaltii ${Number(amount).toFixed(2)} ETB mirkaneessuuf PIN galchaa.`
                      : `Confirm the payment of ${Number(amount).toFixed(2)} ETB to Foodie Restaurant PLC.`}
                </p>

                <div className="pin-input-group">
                  <label>4-Digit Wallet PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={customerPin}
                    onChange={(e) => setCustomerPin(e.target.value)}
                    className="sheet-pin-input"
                    placeholder="••••"
                    autoFocus
                  />
                  <span className="pin-demo-hint">
                    💡 Test PIN: <strong>1234</strong> (auto-filled for quick testing)
                  </span>
                </div>

                <div className="pin-actions-wrap">
                  <button
                    type="button"
                    className="sheet-btn primary btn-confirm-pin"
                    onClick={handleAuthorizePayment}
                    disabled={loading}
                  >
                    {loading ? "Authorizing..." : `✓ Confirm & Pay ${Number(amount).toFixed(2)} ETB`}
                  </button>

                  <button
                    type="button"
                    className="sheet-back-link"
                    onClick={() => setStep("prompt")}
                    disabled={loading}
                  >
                    ← Change mobile number
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: MOBILE WALLET PAY (DEFAULT PRIMARY FLOW) */}
          {step === "prompt" && (
            <div className="sheet-prompt-view">
              {/* Primary Mobile Pay Form */}
              <div className="primary-wallet-form">
                <div className="field-group">
                  <label className="field-label">
                    {language === "am"
                      ? `የ${activeMethod.title} ስልክ ቁጥርዎ (+251)`
                      : language === "om"
                        ? `Lakkoofsa Bilbila ${activeMethod.title} (+251)`
                        : `Your ${activeMethod.title} Mobile Number (+251)`}
                  </label>
                  <div className="phone-input-wrap">
                    <span className="phone-flag">🇪🇹</span>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={ETHIOPIAN_PHONE_PLACEHOLDER}
                      className="sheet-phone-input"
                    />
                  </div>
                  <span className="field-helper">
                    {language === "am"
                      ? `የክፍያ ጥያቄ ወደዚህ ስልክ ይላካል`
                      : language === "om"
                        ? `Gaaffiin kaffaltii gara bilbila kanaatti ergama`
                        : `A payment request will be authorized directly from this number`}
                  </span>
                </div>

                {/* Big, Clear Primary Action Button */}
                <button
                  type="button"
                  className="sheet-btn primary btn-pay-now"
                  onClick={handleInitiatePayment}
                  disabled={loading}
                >
                  {loading ? (
                    <span>Connecting to {activeMethod.title}...</span>
                  ) : (
                    <span>
                      {isTelebirr
                        ? `${t("payWithTelebirr") || "Pay with Telebirr"} • ${Number(amount).toFixed(2)} ETB ➔`
                        : isCbe
                          ? `${t("payWithCbe") || "Pay with CBE Birr"} • ${Number(amount).toFixed(2)} ETB ➔`
                          : `Pay ${Number(amount).toFixed(2)} ETB ➔`}
                    </span>
                  )}
                </button>
              </div>

              {/* Trust Badge */}
              <div className="sheet-trust-row">
                <span>🔒 Secure 256-Bit Encryption</span>
                <span>⚡ Instant Order Confirmation</span>
              </div>

              {/* Collapsible Manual Transfer Section */}
              <div className="sheet-manual-accordion">
                <button
                  type="button"
                  className="manual-toggle-btn"
                  onClick={() => setShowManualSection(!showManualSection)}
                >
                  <span>
                    {showManualSection ? "▾" : "▸"}{" "}
                    {isTelebirr
                      ? "Or pay manually via Telebirr App / *127#"
                      : isCbe
                        ? "Or transfer to CBE Bank Account / *847#"
                        : "Or transfer manually to bank account"}
                  </span>
                  <span className="toggle-sub">Offline / SMS confirmation</span>
                </button>

                {showManualSection && (
                  <div className="manual-content-box">
                    <div className="merchant-account-cards">
                      {isTelebirr && (
                        <div className="account-row-card">
                          <div>
                            <span className="acc-label">Telebirr Merchant Code</span>
                            <strong className="acc-value">{activeMethod.merchantCode}</strong>
                          </div>
                          <button
                            type="button"
                            className="btn-acc-copy"
                            onClick={() => handleCopy(activeMethod.merchantCode, "Merchant Code")}
                          >
                            📋 Copy
                          </button>
                        </div>
                      )}

                      {isCbe && (
                        <>
                          <div className="account-row-card">
                            <div>
                              <span className="acc-label">CBE Account (Foodie Restaurant PLC)</span>
                              <strong className="acc-value">{activeMethod.accountNumber}</strong>
                            </div>
                            <button
                              type="button"
                              className="btn-acc-copy"
                              onClick={() => handleCopy(activeMethod.accountNumber, "Account Number")}
                            >
                              📋 Copy
                            </button>
                          </div>
                          <div className="account-row-card">
                            <div>
                              <span className="acc-label">CBE Birr Shortcode</span>
                              <strong className="acc-value">{activeMethod.shortCode}</strong>
                            </div>
                            <button
                              type="button"
                              className="btn-acc-copy"
                              onClick={() => handleCopy(activeMethod.shortCode, "CBE Birr Shortcode")}
                            >
                              📋 Copy
                            </button>
                          </div>
                        </>
                      )}

                      {!isTelebirr && !isCbe && (
                        <div className="account-row-card">
                          <div>
                            <span className="acc-label">{activeMethod.title} Account</span>
                            <strong className="acc-value">{activeMethod.accountNumber}</strong>
                          </div>
                          <button
                            type="button"
                            className="btn-acc-copy"
                            onClick={() => handleCopy(activeMethod.accountNumber, "Account Number")}
                          >
                            📋 Copy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* USSD Quick Dial */}
                    <div className="manual-ussd-row">
                      <a
                        href={`tel:${activeMethod.ussdDial.replace("#", "%23")}`}
                        className="btn-ussd-dial"
                      >
                        📞 Dial {activeMethod.ussdCode}
                      </a>
                      <span className="ussd-hint">Transfer exact amount: {Number(amount).toFixed(2)} ETB</span>
                    </div>

                    {/* Manual SMS Reference Input */}
                    <form onSubmit={handleVerifyManualReference} className="manual-ref-form">
                      <div className="ref-input-group">
                        <label>
                          {language === "am"
                            ? "በSMS የደረሰዎትን የማረጋገጫ ቁጥር ያስገቡ"
                            : language === "om"
                              ? "Koodii Mirkaneessa SMS galchaa"
                              : "Enter SMS Transaction Reference Code"}
                        </label>
                        <div className="ref-submit-row">
                          <input
                            type="text"
                            value={manualRefCode}
                            onChange={(e) => setManualRefCode(e.target.value)}
                            placeholder={activeMethod.refPlaceholder}
                            className="sheet-ref-input"
                          />
                          <button
                            type="submit"
                            className="btn-verify-ref"
                            disabled={verifyingManual}
                          >
                            {verifyingManual ? "..." : "Verify ✓"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EthiopianPaymentModal;
