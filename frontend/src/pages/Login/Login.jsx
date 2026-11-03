import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithDemo } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRedirect = (user) => {
    const role = (user.role || "").trim().toLowerCase();
    if (role === "admin") {
      navigate("/admin");
    } else if (role === "deliveryman") {
      navigate("/delivery");
    } else {
      navigate("/menu");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.warning("Please enter your email and password");
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        toast.success(`Welcome back, ${result.user?.firstName || "Foodie"}! 👋`);
        handleRedirect(result.user);
      } else {
        toast.error(result.message || "Invalid credentials");
      }
    } catch {
      toast.error("Failed to connect to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (roleType) => {
    setSubmitting(true);
    try {
      const result = await loginWithDemo(roleType);
      if (result.success) {
        toast.success(`Logged in as Demo ${roleType.toUpperCase()}! 🚀`);
        handleRedirect(result.user);
      } else {
        toast.error(result.message || "Failed to log in with demo account");
      }
    } catch {
      toast.error("Network error during demo login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">🍕 Delicious Food Awaits</span>
          <h2>Sign In to Foodie</h2>
          <p>Order your favorite meals in seconds or manage your store</p>
        </div>

        {/* Quick Demo Logins Bar */}
        <div className="demo-login-box">
          <div className="demo-box-label">⚡ Instant 1-Click Demo Login</div>
          <div className="demo-btn-group">
            <button
              type="button"
              className="demo-quick-btn admin-btn"
              onClick={() => handleDemoLogin("admin")}
              disabled={submitting}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="demo-quick-btn customer-btn"
              onClick={() => handleDemoLogin("user")}
              disabled={submitting}
            >
              🍔 Customer
            </button>
            <button
              type="button"
              className="demo-quick-btn delivery-btn"
              onClick={() => handleDemoLogin("delivery")}
              disabled={submitting}
            >
              🚚 Delivery
            </button>
          </div>
        </div>

        <div className="auth-divider">
          <span>or sign in with credentials</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-field-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              required
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="input-field-group">
            <div className="password-header-row">
              <label>Password</label>
            </div>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                required
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Signing In..." : "Sign In →"}
          </button>

          <p className="switch-auth">
            Don't have an account yet? <Link to="/register">Create one here</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
