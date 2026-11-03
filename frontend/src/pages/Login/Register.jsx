import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import "./Login.css";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.firstName.length < 3) {
      toast.warning("First name must be at least 3 characters long");
      return;
    }
    if (formData.lastName.length < 3) {
      toast.warning("Last name must be at least 3 characters long");
      return;
    }
    if (formData.password.length < 6) {
      toast.warning("Password must be at least 6 characters long");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    if (formData.phone.length !== 11) {
      toast.warning("Phone number must be exactly 11 digits (e.g. 01234567890)");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/auth/register", formData);
      toast.success("Account created successfully! Please sign in.");
      navigate("/login");
    } catch (error) {
      console.error("Registration failed", error);
      toast.error(
        error.response?.data?.message ||
        "Registration failed. Please check your information and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <span className="auth-badge">🌟 Join Foodie</span>
          <h2>Create Your Account</h2>
          <p>Get hot meals delivered to your doorstep in minutes</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-field-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="John"
                required
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="input-field-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Doe"
                required
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-field-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="john@example.com"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="input-field-group">
              <label>Phone Number (11 digits)</label>
              <input
                type="tel"
                name="phone"
                placeholder="01234567890"
                required
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div className="input-field-group">
              <label>Default Address</label>
              <input
                type="text"
                name="address"
                placeholder="123 Food Street, Apt 4B"
                required
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-field-group">
              <label>Password (min 6 chars)</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
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

            <div className="input-field-group">
              <label>Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="••••••••"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Creating Account..." : "Create Account →"}
          </button>

          <p className="switch-auth">
            Already have an account? <Link to="/login">Sign In here</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
