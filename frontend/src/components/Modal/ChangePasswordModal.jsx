import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import "./ChangePasswordModal.css";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.warning("Please enter your current password");
      return;
    }

    if (newPassword.length < 6) {
      toast.warning("New password must be at least 6 characters long");
      return;
    }

    if (currentPassword === newPassword) {
      toast.warning("New password must be different from your current password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.put("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success(res.data.message || "Password updated successfully! 🔒");
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to change password. Please check your current password."
      );
    } finally {
      setLoading(false);
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isMatch = confirmPassword && newPassword === confirmPassword;
  const isDifferent = newPassword && currentPassword && newPassword !== currentPassword;

  return (
    <div className="change-pw-backdrop" onClick={onClose}>
      <div className="change-pw-card" onClick={(e) => e.stopPropagation()}>
        <div className="change-pw-header">
          <div className="change-pw-icon">🔒</div>
          <div>
            <h3>Change Password</h3>
            <p>Update your account password anytime</p>
          </div>
          <button className="change-pw-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form className="change-pw-form" onSubmit={handleSubmit}>
          {/* Current Password */}
          <div className="change-pw-field">
            <label>Current Password</label>
            <div className="change-pw-input-wrap">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                required
                autoFocus
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                className="change-pw-eye"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label="Toggle current password visibility"
              >
                {showCurrent ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="change-pw-field">
            <label>New Password</label>
            <div className="change-pw-input-wrap">
              <input
                type={showNew ? "text" : "password"}
                placeholder="At least 6 characters"
                value={newPassword}
                required
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="change-pw-eye"
                onClick={() => setShowNew(!showNew)}
                aria-label="Toggle new password visibility"
              >
                {showNew ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="change-pw-field">
            <label>Confirm New Password</label>
            <div className="change-pw-input-wrap">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="change-pw-eye"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {/* Checklist */}
          <div className="change-pw-checklist">
            <span className={`check-item ${isMinLength ? "met" : ""}`}>
              {isMinLength ? "✓" : "○"} At least 6 characters
            </span>
            <span className={`check-item ${isDifferent ? "met" : ""}`}>
              {isDifferent ? "✓" : "○"} Different from current password
            </span>
            <span className={`check-item ${isMatch ? "met" : ""}`}>
              {isMatch ? "✓" : "○"} Passwords match
            </span>
          </div>

          {/* Modal Actions */}
          <div className="change-pw-actions">
            <button
              type="button"
              className="change-pw-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="change-pw-btn-submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
