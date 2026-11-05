import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../Modal/ConfirmModal";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { totalItemCount } = useContext(CartContext);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/menu" className="logo" onClick={() => setMobileMenuOpen(false)}>
            <span className="logo-icon">🍽️</span>
            Foodie<span className="dot">.</span>
          </Link>

          {/* Desktop Links */}
          <div className="nav-links desktop-only">
            {user ? (
              <>
                <Link
                  to="/menu"
                  className={`nav-link ${location.pathname === "/menu" ? "active" : ""}`}
                >
                  {role === "admin" || role === "deliveryman" ? "🍽️ Menu Preview" : "Menu"}
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
                <Link to="/menu" className="nav-link">
                  Menu
                </Link>
                <Link to="/cart" className="nav-link cart-link">
                  <span>🛒 Cart</span>
                  {totalItemCount > 0 && (
                    <span className="cart-badge animate-bounce">
                      {totalItemCount}
                    </span>
                  )}
                </Link>
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
                {role === "admin" || role === "deliveryman" ? "🍽️ Menu Preview" : "🍽️ Browse Menu"}
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

              {!user && (
                <Link
                  to="/cart"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🛒 Cart ({totalItemCount})
                </Link>
              )}

              <Link
                to="/about"
                className="mobile-nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                ℹ️ About Us
              </Link>

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
