import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import ConfirmModal from "../Modal/ConfirmModal";
import NotificationCenter from "../NotificationCenter/NotificationCenter";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { totalItemCount } = useContext(CartContext);
  const { toast } = useToast();
  const { language, changeLanguage, t, languages, currentLanguageInfo } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const dropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

  const role = (user?.role || "").trim().toLowerCase();
  const isCustomer = !user || role === "user" || role === "customer";
  const isAdmin = role === "admin";
  const isDriver = role === "deliveryman";

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setLangDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setUserDropdownOpen(false);
    toast.info("Logged out successfully");
    navigate("/login");
  };

  const getProfileLink = () => {
    if (isAdmin) return "/admin?tab=profile";
    if (isDriver) return "/delivery?tab=profile";
    return "/profile";
  };

  const getDashboardLink = () => {
    if (isAdmin) return "/admin";
    if (isDriver) return "/delivery";
    return "/customer";
  };

  const getDashboardLabel = () => {
    if (isAdmin) return t("adminDashboard");
    if (isDriver) return t("deliveryHub");
    return t("customerDashboard");
  };

  const displayName =
    user?.firstName || user?.name?.split(" ")[0] || (isAdmin ? "Admin" : isDriver ? "Courier" : "User");
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          {/* Brand Logo */}
          <Link to="/menu" className="logo" onClick={() => setMobileMenuOpen(false)}>
            <span className="logo-icon">🍽️</span>
            Foodie<span className="dot">.</span>
          </Link>

          {/* Desktop Navigation Links (Center) */}
          <div className="nav-links desktop-only">
            <Link
              to="/menu"
              className={`nav-link ${location.pathname === "/menu" ? "active" : ""}`}
            >
              {isAdmin || isDriver ? t("menuPreview") : t("menu")}
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`nav-link admin-nav-link ${location.pathname === "/admin" ? "active" : ""}`}
              >
                {t("adminDashboard")}
              </Link>
            )}

            {isDriver && (
              <Link
                to="/delivery"
                className={`nav-link delivery-nav-link ${location.pathname === "/delivery" ? "active" : ""}`}
              >
                {t("deliveryHub")}
              </Link>
            )}

            {isCustomer && user && (
              <>
                <Link
                  to="/customer"
                  className={`nav-link ${location.pathname === "/customer" ? "active" : ""}`}
                >
                  {t("customerDashboard")}
                </Link>
                <Link
                  to="/orders"
                  className={`nav-link ${location.pathname.startsWith("/orders") ? "active" : ""}`}
                >
                  {t("orders")}
                </Link>
              </>
            )}

            <Link
              to="/about"
              className={`nav-link ${location.pathname === "/about" ? "active" : ""}`}
            >
              {t("about")}
            </Link>
          </div>

          {/* Right Action Cluster */}
          <div className="nav-actions-cluster desktop-only">
            {/* Language Selector Dropdown (English, Afaan Oromoo, Amharic) */}
            <div className="language-selector-wrapper" ref={langDropdownRef}>
              <button
                type="button"
                className={`lang-select-btn ${langDropdownOpen ? "open" : ""}`}
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                aria-label="Select Language"
                title="Switch Language (English / Afaan Oromoo / አማርኛ)"
              >
                <span className="lang-flag">{currentLanguageInfo.flag}</span>
                <span className="lang-code">{currentLanguageInfo.code.toUpperCase()}</span>
                <span className="lang-chevron">{langDropdownOpen ? "▲" : "▼"}</span>
              </button>

              {langDropdownOpen && (
                <div className="lang-dropdown-menu">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={`lang-option-item ${language === l.code ? "active" : ""}`}
                      onClick={() => {
                        changeLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                    >
                      <span className="lang-option-flag">{l.flag}</span>
                      <span className="lang-option-name">{l.nativeName}</span>
                      {language === l.code && <span className="lang-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Shopping Cart (Customers & Guests only) */}
            {isCustomer && (
              <Link
                to="/cart"
                className={`cart-btn-link ${location.pathname === "/cart" ? "active" : ""}`}
                title="View Shopping Cart"
              >
                <span className="cart-btn-icon">🛒</span>
                <span className="cart-btn-label">{t("cart")}</span>
                {totalItemCount > 0 && (
                  <span className="cart-badge animate-bounce">
                    {totalItemCount}
                  </span>
                )}
              </Link>
            )}

            {/* In-App Real-time Notification Center */}
            {user && <NotificationCenter />}

            {/* User Dropdown or Guest Auth Links */}
            {user ? (
              <div className="user-dropdown-wrapper" ref={dropdownRef}>
                <button
                  type="button"
                  className={`user-avatar-pill ${userDropdownOpen ? "open" : ""}`}
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                >
                  <div className="user-avatar-circle">{userInitial}</div>
                  <span className="user-avatar-name">{displayName}</span>
                  <span className="chevron-icon">{userDropdownOpen ? "▲" : "▼"}</span>
                </button>

                {userDropdownOpen && (
                  <div className="user-dropdown-menu">
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar">{userInitial}</div>
                      <div className="dropdown-user-details">
                        <span className="dropdown-name">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : displayName}
                        </span>
                        <span className="dropdown-email">{user.email}</span>
                        <span className={`dropdown-role-tag role-${role}`}>
                          {isAdmin
                            ? "👑 Administrator"
                            : isDriver
                            ? "🛵 Delivery Courier"
                            : "🛍️ Customer"}
                        </span>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <div className="dropdown-links-list">
                      <Link
                        to={getProfileLink()}
                        className="dropdown-item"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <span className="item-icon">👤</span>
                        <span>{t("profileAndSecurity")}</span>
                      </Link>

                      <Link
                        to={getDashboardLink()}
                        className="dropdown-item"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <span className="item-icon">
                          {isAdmin ? "⚙️" : isDriver ? "🛵" : "📦"}
                        </span>
                        <span>{getDashboardLabel()}</span>
                      </Link>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button
                      type="button"
                      className="dropdown-item logout-item"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                    >
                      <span className="item-icon">🚪</span>
                      <span>{t("signOut")}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="guest-action-btns">
                <Link to="/login" className="nav-login-btn">
                  {t("signIn")}
                </Link>
                <Link to="/register" className="nav-register-btn">
                  {t("signUp")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Cluster (Cart + Hamburger) */}
          <div className="mobile-right-cluster mobile-only">
            {isCustomer && (
              <Link to="/cart" className="mobile-cart-btn" aria-label="Cart">
                <span>🛒</span>
                {totalItemCount > 0 && (
                  <span className="cart-badge animate-bounce">{totalItemCount}</span>
                )}
              </Link>
            )}

            <button
              className={`hamburger-btn ${mobileMenuOpen ? "open" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer mobile-only">
            {/* Mobile Language Switcher Row */}
            <div className="mobile-lang-row">
              <span className="mobile-lang-label">🌐 Language / Afaan / ቋንቋ:</span>
              <div className="mobile-lang-pills">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`mobile-lang-pill ${language === l.code ? "active" : ""}`}
                    onClick={() => changeLanguage(l.code)}
                  >
                    <span>{l.flag}</span> {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {user ? (
              <div className="mobile-user-card">
                <div className="mobile-avatar">{userInitial}</div>
                <div className="mobile-user-details">
                  <div className="mobile-name">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : displayName}
                  </div>
                  <div className="mobile-email">{user.email}</div>
                  <span className={`dropdown-role-tag role-${role}`}>
                    {isAdmin
                      ? "👑 Administrator"
                      : isDriver
                      ? "🛵 Delivery Courier"
                      : "🛍️ Customer"}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mobile-links-list">
              <Link
                to="/menu"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {isAdmin || isDriver ? t("menuPreview") : t("menu")}
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("adminDashboard")}
                </Link>
              )}

              {isDriver && (
                <Link
                  to="/delivery"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("deliveryHub")}
                </Link>
              )}

              {isCustomer && user && (
                <>
                  <Link
                    to="/customer"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("customerDashboard")}
                  </Link>
                  <Link
                    to="/orders"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("orders")}
                  </Link>
                </>
              )}

              {user && (
                <Link
                  to={getProfileLink()}
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("profileAndSecurity")}
                </Link>
              )}

              <Link
                to="/about"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("about")}
              </Link>

              {user ? (
                <button
                  type="button"
                  className="mobile-logout-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  🚪 {t("signOut")}
                </button>
              ) : (
                <div className="mobile-auth-actions">
                  <Link
                    to="/login"
                    className="nav-login-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("signIn")}
                  </Link>
                  <Link
                    to="/register"
                    className="nav-register-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("signUp")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to log out of your session?"
        confirmText="Log Out"
        cancelText="Stay Logged In"
        type="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};

export default Navbar;
