import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
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
    nameAm: "ቴሌብር (ኢትዮ ቴሌኮም)",
    nameOm: "Telebirr (Ityoo Teelekoom)",
    shortName: "Telebirr",
    provider: "Ethio Telecom",
    merchantName: "Foodie Restaurant PLC",
    merchantCode: "554433",
    merchantPhone: "+251911223344",
    ussdCode: "*127#",
    ussdDial: "*127#",
    instructions: {
      en: [
        "Open your Telebirr App or dial *127# on your mobile phone",
        "Select 'Pay Merchant' or 'Send Money'",
        "Enter Restaurant Merchant Code: 554433 (or phone +251 911 223 344)",
        "Confirm amount and enter your Telebirr 4-digit PIN",
        "Copy the Transaction Reference number from the Ethio Telecom SMS confirmation",
      ],
      am: [
        "የቴሌብር መተግበሪያን ይክፈቱ ወይም በስልክዎ *127# ይደውሉ",
        "'ነጋዴ ክፈል' (Pay Merchant) የሚለውን ይምረጡ",
        "የምግብ ቤቱን መለያ ቁጥር: 554433 (ወይም ስልክ 0911223344) ያስገቡ",
        "የትዕዛዙን ጠቅላላ ዋጋ አረጋግጠው የቴሌብር ሚስጥር ቁጥርዎን ያስገቡ",
        "በኢትዮ ቴሌኮም SMS የደረሰዎትን የትራንዛክሽን ማረጋገጫ ቁጥር ከታች ያስገቡ",
      ],
      om: [
        "Appii Telebirr bani ykn bilbila kee irraa *127# bilbili",
        "'Daldalaa Kaffali' (Pay Merchant) filadhu",
        "Koodii Daldalaa Mana Nyaataa: 554433 (ykn bilbila 0911223344) galchi",
        "Gatii nyaataa mirkaneessuun PIN Telebirr kee galchi",
        "Koodii mirkaneessaa SMS Ityoo Teelekoom irraa dhufe asitti galchi",
      ],
    },
    refPlaceholder: "e.g., TLB-20268492 or 10-digit SMS code",
    icon: "📱",
    color: "#0284c7",
    badge: "Official Ethio Telecom Merchant",
  },
  {
    id: "cbe",
    methodKey: "CBE",
    name: "Commercial Bank of Ethiopia (CBE / CBE Birr)",
    nameAm: "የኢትዮጵያ ንግድ ባንክ (CBE / ሲቢኢ ብር)",
    nameOm: "Baankii Daldala Itoophiyaa (CBE / CBE Birr)",
    shortName: "CBE Birr & Mobile",
    provider: "Commercial Bank of Ethiopia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "1000234567891",
    shortCode: "998877",
    ussdCode: "*847#",
    ussdDial: "*847#",
    instructions: {
      en: [
        "Open CBE Mobile Banking App or dial *847#",
        "Transfer to Account 1000234567891 OR CBE Birr Shortcode 998877",
        "Recipient Name will show: Foodie Restaurant PLC",
        "Confirm transfer of the exact amount and save your reference",
        "Enter the CBE confirmation code (e.g. FT260198471) below to verify",
      ],
      am: [
        "የCBE ሞባይል ባንኪንግ መተግበሪያን ይክፈቱ ወይም በስልክዎ *847# ይደውሉ",
        "ወደ ሂሳብ ቁጥር 1000234567891 ወይም የCBE Birr አጭር መለያ 998877 ያስተላልፉ",
        "የተቀባዩ ስም 'Foodie Restaurant PLC' መሆኑን ያረጋግጡ",
        "የትዕዛዙን ጠቅላላ ዋጋ በብር አስገብተው ክፍያውን ይፈጽሙ",
        "የባንኩን የትራንዛክሽን ማረጋገጫ ቁጥር (ለምሳሌ፡ FT...) ከታች ያስገቡ",
      ],
      om: [
        "Appii Baankii Daldala Itoophiyaa (CBE) bani ykn *847# bilbili",
        "Lakkoofsa Herregaa 1000234567891 ykn Koodii CBE Birr 998877 tti dabarsi",
        "Maqaan herregaa 'Foodie Restaurant PLC' ta'uu mirkaneeffadhu",
        "Hanga kaffaltii guutuu galchuun kaffaltii xumuri",
        "Koodii mirkaneessaa Baankii (fakkeenyaaf: FT...) asitti galchi",
      ],
    },
    refPlaceholder: "e.g., FT260198471 or CBE SMS Transaction ID",
    icon: "🏦",
    color: "#7e22ce",
    badge: "CBE Birr & CBE Mobile",
  },
  {
    id: "abyssinia",
    methodKey: "BankTransfer",
    name: "Bank of Abyssinia (BoA)",
    nameAm: "የአቢሲኒያ ባንክ (አፖሎ)",
    nameOm: "Baankii Abisiiniyaa",
    shortName: "BoA Mobile",
    provider: "Bank of Abyssinia",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "8877665544",
    ussdCode: "*815#",
    ussdDial: "*815#",
    instructions: {
      en: [
        "Open BoA Mobile Banking App (Apollo) or dial *815#",
        "Select Transfer -> To BoA Account",
        "Enter Account: 8877665544 (Foodie Restaurant PLC)",
        "Enter total order amount in ETB",
        "Copy your BoA confirmation reference number below",
      ],
      am: [
        "የአቢሲኒያ ሞባይል ባንኪንግ መተግበሪያን (Apollo) ይክፈቱ ወይም *815# ይደውሉ",
        "ወደ ሂሳብ ቁጥር: 8877665544 (Foodie Restaurant PLC) ያስተላልፉ",
        "የትዕዛዙን ጠቅላላ ዋጋ በብር ያስገቡ",
        "የአቢሲኒያ የትራንዛክሽን ማረጋገጫ ቁጥር ከታች ያስገቡ",
      ],
      om: [
        "Appii BoA (Apollo) bani ykn *815# bilbili",
        "Lakkoofsa Herregaa: 8877665544 (Foodie Restaurant PLC) tti dabarsi",
        "Gatii nyaataa guutuu galchi",
        "Koodii mirkaneessaa BoA asitti galchi",
      ],
    },
    refPlaceholder: "e.g., BOA-9810294 or BoA Reference",
    icon: "🏛️",
    color: "#b45309",
    badge: "BoA Mobile Banking",
  },
  {
    id: "awash",
    methodKey: "BankTransfer",
    name: "Awash Bank (Awash Birr)",
    nameAm: "አዋሽ ባንክ (አዋሽ ብር)",
    nameOm: "Baankii Awaash",
    shortName: "Awash Birr",
    provider: "Awash International Bank",
    merchantName: "Foodie Restaurant PLC",
    accountNumber: "01320492817200",
    ussdCode: "*901#",
    ussdDial: "*901#",
    instructions: {
      en: [
        "Open Awash Birr App or dial *901#",
        "Transfer to Awash Account: 01320492817200",
        "Verify merchant name: Foodie Restaurant PLC",
        "Complete transfer and enter your transaction reference below",
      ],
      am: [
        "የአዋሽ ብር መተግበሪያን ይክፈቱ ወይም በስልክዎ *901# ይደውሉ",
        "ወደ አዋሽ ሂሳብ ቁጥር: 01320492817200 ያስተላልፉ",
        "የተቀባዩ ስም 'Foodie Restaurant PLC' መሆኑን ያረጋግጡ",
        "ክፍያውን ፈጽመው የትራንዛክሽን ማረጋገጫ ቁጥሩን ከታች ያስገቡ",
      ],
      om: [
        "Appii Awaash Birr bani ykn *901# bilbili",
        "Lakkoofsa Herregaa: 01320492817200 tti dabarsi",
        "Maqaan 'Foodie Restaurant PLC' ta'uu mirkaneeffadhu",
        "Koodii mirkaneessaa asitti galchi",
      ],
    },
    refPlaceholder: "e.g., AWSH-7482910 or Awash Reference",
    icon: "🏦",
    color: "#059669",
    badge: "Awash Birr",
  },
];

const resolveInitialMethodId = (method) => {
  if (!method) return "telebirr";
  const clean = String(method).toLowerCase();
  if (clean === "cbe" || clean.includes("cbe")) return "cbe";
  if (clean.includes("abyssinia")) return "abyssinia";
  if (clean.includes("awash")) return "awash";
  if (clean.includes("bank")) return "cbe";
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

  const [selectedMethodId, setSelectedMethodId] = useState(() => resolveInitialMethodId(initialMethod));
  const [senderPhone, setSenderPhone] = useState(user?.phone || "");
  const [referenceCode, setReferenceCode] = useState("");
  const [notes, setNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedReceipt, setVerifiedReceipt] = useState(null);
  const [openingGateway, setOpeningGateway] = useState(false);

  // Sync selected method if initialMethod changes
  useEffect(() => {
    if (initialMethod) {
      setSelectedMethodId(resolveInitialMethodId(initialMethod));
    }
  }, [initialMethod]);

  const handleLaunchGateway = async () => {
    setOpeningGateway(true);
    try {
      const res = await apiClient.post("/payments/gateway/session", {
        orderId,
        paymentMethod: activeOption.methodKey,
      });
      if (res.data?.sessionId) {
        const checkoutUrl = res.data.checkoutUrl;
        if (
          checkoutUrl &&
          (checkoutUrl.startsWith("http://") || checkoutUrl.startsWith("https://")) &&
          !checkoutUrl.includes(window.location.host)
        ) {
          window.location.href = checkoutUrl;
        } else {
          navigate(`/gateway/checkout/${res.data.sessionId}`);
        }
      }
    } catch (err) {
      console.error("Gateway launch error:", err);
      toast.error(err.response?.data?.message || "Failed to open gateway portal.");
    } finally {
      setOpeningGateway(false);
    }
  };

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

            {/* Quick Online Gateway Banner */}
            <div className="gateway-quick-switch-banner">
              <div className="gateway-switch-info">
                <span className="gateway-badge-pill">🇪🇹 ONLINE</span>
                <div>
                  <strong>
                    {activeOption.id === "telebirr"
                      ? "Telebirr SuperApp Checkout Portal"
                      : activeOption.id === "cbe"
                        ? "CBE Birr Online Payment Portal"
                        : "Online Gateway Checkout"}
                  </strong>
                  <p>Open interactive web portal with PIN & OTP authorization</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-launch-gateway-portal"
                onClick={handleLaunchGateway}
                disabled={openingGateway}
              >
                {openingGateway ? "Launching..." : `Open ${activeOption.shortName} Portal ➔`}
              </button>
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

            {/* Order Items Preview (if passed) */}
            {orderItems && orderItems.length > 0 && (
              <div className="modal-order-items-preview">
                <span className="items-preview-title">🛍️ Order Items ({orderItems.length}):</span>
                <div className="items-preview-chips">
                  {orderItems.map((item, idx) => (
                    <span key={idx} className="preview-item-chip">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Merchant Account Details Box */}
            <div className="merchant-details-card">
              <div className="merchant-card-top">
                <div className="merchant-title-wrap">
                  <span className="provider-icon">{activeOption.icon}</span>
                  <div>
                    <h4>{language === "am" && activeOption.nameAm ? activeOption.nameAm : language === "om" && activeOption.nameOm ? activeOption.nameOm : activeOption.name}</h4>
                    <span className="merchant-verified-tag">
                      {activeOption.badge}
                    </span>
                  </div>
                </div>

                <div className="merchant-name-pill">
                  {activeOption.merchantName}
                </div>
              </div>

              {/* Account / Short Code rows */}
              <div className="account-details-list">
                {activeOption.id === "telebirr" && (
                  <>
                    <div className="account-number-display">
                      <div className="account-number-group">
                        <span className="account-field-label">Telebirr Merchant Short Code</span>
                        <strong className="account-code-value">554433</strong>
                      </div>
                      <button
                        type="button"
                        className="copy-account-btn"
                        onClick={() => handleCopy("554433", "Telebirr Merchant Code")}
                      >
                        📋 Copy
                      </button>
                    </div>

                    <div className="account-number-display">
                      <div className="account-number-group">
                        <span className="account-field-label">Merchant Phone (+251)</span>
                        <strong className="account-code-value">+251 911 223 344</strong>
                      </div>
                      <button
                        type="button"
                        className="copy-account-btn"
                        onClick={() => handleCopy("+251911223344", "Merchant Phone")}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </>
                )}

                {activeOption.id === "cbe" && (
                  <>
                    <div className="account-number-display">
                      <div className="account-number-group">
                        <span className="account-field-label">CBE Account Number (Foodie Restaurant PLC)</span>
                        <strong className="account-code-value">1000234567891</strong>
                      </div>
                      <button
                        type="button"
                        className="copy-account-btn"
                        onClick={() => handleCopy("1000234567891", "CBE Account Number")}
                      >
                        📋 Copy
                      </button>
                    </div>

                    <div className="account-number-display">
                      <div className="account-number-group">
                        <span className="account-field-label">CBE Birr Shortcode</span>
                        <strong className="account-code-value">998877</strong>
                      </div>
                      <button
                        type="button"
                        className="copy-account-btn"
                        onClick={() => handleCopy("998877", "CBE Birr Shortcode")}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </>
                )}

                {activeOption.id === "abyssinia" && (
                  <div className="account-number-display">
                    <div className="account-number-group">
                      <span className="account-field-label">BoA Account Number (Foodie Restaurant PLC)</span>
                      <strong className="account-code-value">8877665544</strong>
                    </div>
                    <button
                      type="button"
                      className="copy-account-btn"
                      onClick={() => handleCopy("8877665544", "BoA Account")}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}

                {activeOption.id === "awash" && (
                  <div className="account-number-display">
                    <div className="account-number-group">
                      <span className="account-field-label">Awash Account Number (Foodie Restaurant PLC)</span>
                      <strong className="account-code-value">01320492817200</strong>
                    </div>
                    <button
                      type="button"
                      className="copy-account-btn"
                      onClick={() => handleCopy("01320492817200", "Awash Account")}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
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
                  {(
                    Array.isArray(activeOption.instructions)
                      ? activeOption.instructions
                      : activeOption.instructions[language] ||
                        activeOption.instructions.en
                  ).map((step, idx) => (
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
