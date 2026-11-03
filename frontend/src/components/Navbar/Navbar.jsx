import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../Modal/ConfirmModal";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout, loginWithDemo } = useContext(AuthContext);
  const { totalItemCount } = useContext(CartContext);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const role = (user?.role || "").trim().toLowerCase();

  // Hide navbar on pure login/register if needed, but keeping it visible with login/register links is cleaner
  // If explicitly on /login or /register, let's keep minimal or full navbar
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    toast.info("Logged out successfully");
    navigate("/login");
  };

  const handleQuickDemoSwitch = async (roleType) => {
    try {
      const res = await loginWithDemo(roleType);
      setShowDemoModal(false);
      setMobileMenuOpen(false);
      if (res.success) {
        toast.success(`Switched to Demo ${roleType.toUpperCase()}! 🚀`);
        if (roleType === "admin") navigate("/admin");
        else if (roleType === "delivery" || roleType === "deliveryMan") navigate("/delivery");
        else navigate("/menu");
      } else {
        toast.error(res.message || "Failed to switch demo account");
      }
    } catch {
      toast.error("Failed to login to demo account");
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/menu" className="logo" onClick={() => setMobileMenuOpen(false)}>
            <span className="logo-icon">🍽️</span>
            Foodie<span className="dot">.</span>
          </Link>

          {/* Quick Demo Switcher Pill */}
          <button
            className="demo-switch-pill"
            onClick={() => setShowDemoModal(true)}
            title="Switch Demo Roles (Admin / Customer / Delivery)"
          >
            <span className="pill-pulse"></span>
            ⚡ Demo Roles
          </button>

          {/* Desktop Links */}
          <div className="nav-links desktop-only">
            {user ? (
              <>
                <Link
                  to="/menu"
                  className={`nav-link ${location.pathname === "/menu" ? "active" : ""}`}
                >
                  Menu
                </Link>

                {role === "admin" && (
                  <Link
                    to="/admin"
                    className={`nav-link admin-nav-link ${location.pathname === "/admin" ? "active" : ""}`}
                  >
                    👑 Admin Panel
                  </Link>
                )}

                {role === "deliveryman" && (
                  <Link
                    to="/delivery"
                    className={`nav-link delivery-nav-link ${location.pathname === "/delivery" ? "active" : ""}`}
                  >
                    🚚 Delivery Hub
                  </Link>
                )}

                {role === "user" && (
                  <>
                    <Link
                      to="/orders"
                      className={`nav-link ${location.pathname.startsWith("/orders") ? "active" : ""}`}
                    >
                      Orders
                    </Link>

                    <Link
                      to="/cart"
                      className={`nav-link cart-link ${location.pathname === "/cart" ? "active" : ""}`}
                    >
                      <span>🛒 Cart</span>
                      {totalItemCount > 0 && (
                        <span className="cart-badge animate-bounce">
                          {totalItemCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}

                {/* User Profile / Role Pill */}
                <div className="user-profile-badge">
                  <span className={`role-tag role-${role}`}>
                    {role === "admin" ? "Admin" : role === "deliveryman" ? "Delivery" : "Customer"}
                  </span>
                  <span className="user-name">
                    {user.firstName || user.name || "User"}
                  </span>
                </div>

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="logout-btn"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="guest-links">
                <Link to="/about" className="nav-link">
                  About
                </Link>
                <Link to="/login" className="login-link-btn">
                  Sign In
                </Link>
                <Link to="/register" className="register-link-btn">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className={`hamburger-btn mobile-only ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer mobile-only">
            {user ? (
              <div className="mobile-user-header">
                <div className="user-avatar-placeholder">
                  {(user.firstName || user.name || "U")[0]}
                </div>
                <div>
                  <div className="mobile-user-name">{user.firstName || user.name}</div>
                  <span className={`role-tag role-${role}`}>{role}</span>
                </div>
              </div>
            ) : null}

            <div className="mobile-links-list">
              <Link
                to="/menu"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                🍽️ Browse Menu
              </Link>

              {role === "admin" && (
                <Link
                  to="/admin"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  👑 Admin Dashboard
                </Link>
              )}

              {role === "deliveryman" && (
                <Link
                  to="/delivery"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🚚 Delivery Hub
                </Link>
              )}

              {role === "user" && (
                <>
                  <Link
                    to="/orders"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📦 My Orders
                  </Link>
                  <Link
                    to="/cart"
                    className="mobile-nav-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🛒 My Cart ({totalItemCount})
                  </Link>
                </>
              )}

              <Link
                to="/about"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                ℹ️ About Us
              </Link>

              <button
                className="mobile-demo-btn"
                onClick={() => {
                  setShowDemoModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                ⚡ Switch Demo Account
              </button>

              {user ? (
                <button
                  className="mobile-logout-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  Sign Out
                </button>
              ) : (
                <div className="mobile-auth-actions">
                  <Link
                    to="/login"
                    className="login-link-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="register-link-btn"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Demo Account Switcher Modal */}
      {showDemoModal && (
        <div className="modal-backdrop" onClick={() => setShowDemoModal(false)}>
          <div
            className="demo-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="demo-modal-header">
              <h3>⚡ One-Click Demo Logins</h3>
              <button
                className="close-x-btn"
                onClick={() => setShowDemoModal(false)}
              >
                ×
              </button>
            </div>
            <p className="demo-modal-subtitle">
              Test any role instantly without typing credentials:
            </p>

            <div className="demo-role-grid">
              <button
                className="demo-card-btn admin"
                onClick={() => handleQuickDemoSwitch("admin")}
              >
                <div className="demo-card-icon">👑</div>
                <div className="demo-card-info">
                  <h4>Administrator</h4>
                  <p>Manage orders, menu items, categories, sales reports & PDF</p>
                  <span className="demo-email-badge">admin@foodie.com</span>
                </div>
              </button>

              <button
                className="demo-card-btn customer"
                onClick={() => handleQuickDemoSwitch("user")}
              >
                <div className="demo-card-icon">🍔</div>
                <div className="demo-card-info">
                  <h4>Customer</h4>
                  <p>Browse dishes, add to cart, apply promo codes & track deliveries</p>
                  <span className="demo-email-badge">user@foodie.com</span>
                </div>
              </button>

              <button
                className="demo-card-btn delivery"
                onClick={() => handleQuickDemoSwitch("delivery")}
              >
                <div className="demo-card-icon">🚚</div>
                <div className="demo-card-info">
                  <h4>Delivery Driver</h4>
                  <p>Accept pending orders, view customer address & mark delivered</p>
                  <span className="demo-email-badge">delivery@foodie.com</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

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
