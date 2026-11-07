import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleRedirect = (user) => {
    const role = (user.role || "").trim().toLowerCase();
    if (role === "admin") {
      navigate("/admin");
    } else if (role === "deliveryman") {
      navigate("/delivery");
    } else {
      navigate("/customer");
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

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-badge">🍕 Delicious Food Awaits</span>
          <h2>{t("signIn")} to Foodie</h2>
          <p>{t("signInSubtitle")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-field-group">
            <label>{t("emailAddress")}</label>
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
              <label>{t("password")}</label>
              <Link to="/forgot-password" className="forgot-password-link">
                {t("forgotPassword")}
              </Link>
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
            {submitting ? "Signing In..." : `${t("signIn")} →`}
          </button>

          <p className="switch-auth">
            {t("dontHaveAccount")}{" "}
            <Link to="/register">{t("createOne")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
