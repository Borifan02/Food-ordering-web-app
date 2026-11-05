import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Request Code, 2: Enter Code & New Password
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverProvidedCode, setServerProvidedCode] = useState(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Step 1: Submit email to generate reset code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.warning("Please enter your registered email address");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/forgot-password", { email: cleanEmail });
      toast.success(res.data.message || "Reset code generated! Check your email or screen.");
      if (res.data.resetCode) {
        setServerProvidedCode(res.data.resetCode);
        setResetCode(res.data.resetCode);
      }
      setStep(2);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not generate reset code. Please check your email."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password using code
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      toast.warning("Please enter the 6-digit reset code");
      return;
    }
    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/reset-password", {
        email: email.trim(),
        resetCode: resetCode.trim(),
        newPassword,
        confirmPassword,
      });

      toast.success(res.data.message || "Password reset successfully! 🎉");
      navigate("/login");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to reset password. Please check your code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card forgot-password-card">
        <div className="auth-header">
          <span className="auth-badge">🔐 Account Recovery</span>
          <h2>Reset Password</h2>
          <p>
            {step === 1
              ? "Enter your email to receive a 6-digit verification code"
              : "Enter your verification code and choose a new password"}
          </p>
        </div>

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleRequestCode}>
            <div className="input-field-group">
              <label>Registered Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                required
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
              />
              <span className="input-field-hint">
                Works for Customers, Delivery Drivers, and Restaurant Admins.
              </span>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Generating Code..." : "Send Verification Code →"}
            </button>

            <p className="switch-auth">
              Remembered your password? <Link to="/login">Back to Sign In</Link>
            </p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="recovery-email-banner">
              <span>
                Resetting for: <strong>{email}</strong>
              </span>
              <button
                type="button"
                className="change-email-btn"
                onClick={() => {
                  setStep(1);
                  setServerProvidedCode(null);
                }}
              >
                Change Email
              </button>
            </div>

            {serverProvidedCode && (
              <div className="recovery-code-notice">
                <div className="code-notice-icon">⚡</div>
                <div className="code-notice-text">
                  <span>Your 6-digit verification code:</span>
                  <strong className="code-display">{serverProvidedCode}</strong>
                </div>
                <button
                  type="button"
                  className="fill-code-btn"
                  onClick={() => setResetCode(serverProvidedCode)}
                >
                  Auto-fill
                </button>
              </div>
            )}

            <div className="input-field-group">
              <label>6-Digit Verification Code</label>
              <input
                type="text"
                placeholder="e.g. 123456"
                maxLength={6}
                value={resetCode}
                required
                className="code-input"
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="input-field-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  required
                  onChange={(e) => setNewPassword(e.target.value)}
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
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showConfirmPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {/* Live Password Rules */}
            <div className="password-rules-box">
              <div className={`rule-item ${newPassword.length >= 6 ? "rule-met" : ""}`}>
                {newPassword.length >= 6 ? "✓" : "○"} At least 6 characters
              </div>
              <div
                className={`rule-item ${
                  confirmPassword && newPassword === confirmPassword ? "rule-met" : ""
                }`}
              >
                {confirmPassword && newPassword === confirmPassword ? "✓" : "○"} Passwords match
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Resetting Password..." : "Update Password & Sign In ➔"}
            </button>

            <div className="step2-footer-links">
              <button
                type="button"
                className="resend-code-btn"
                onClick={handleRequestCode}
                disabled={loading}
              >
                🔄 Request New Code
              </button>
              <Link to="/login" className="back-link">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
