import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import apiClient from "../../api/axios";
import "./UserProfileManager.css";

const UserProfileManager = () => {
  const { user, updateUser } = useContext(AuthContext);
  const { toast } = useToast();

  const role = (user?.role || "").trim().toLowerCase();

  // Personal Info form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || user?.name?.split(" ")[0] || "",
    lastName: user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || user.name?.split(" ")[0] || "",
        lastName: user.lastName || user.name?.split(" ").slice(1).join(" ") || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.firstName.trim()) {
      toast.warning("First name cannot be empty");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await apiClient.put("/auth/profile", {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
      });

      const updated = res.data.user || res.data;
      updateUser(updated);
      toast.success("Profile information updated successfully! ✨");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile information");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
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
      toast.warning("New password must be different from current password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await apiClient.put("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success(res.data.message || "Password updated successfully! 🔒");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to change password. Check your current password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isMatch = confirmPassword && newPassword === confirmPassword;
  const isDifferent = newPassword && currentPassword && newPassword !== currentPassword;

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || user?.name || "User";

  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="user-profile-manager">
      {/* Overview Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-avatar">
          {userInitial}
        </div>
        <div className="profile-hero-info">
          <div className="profile-hero-name-row">
            <h2>{displayName}</h2>
            <span className={`role-badge role-${role}`}>
              {role === "admin"
                ? "👑 Administrator"
                : role === "deliveryman"
                ? "🛵 Delivery Courier"
                : "🛍️ Customer"}
            </span>
          </div>
          <p className="profile-hero-email">{user?.email}</p>
          <div className="profile-meta-pills">
            {user?.phone && (
              <span className="profile-pill">📞 {user.phone}</span>
            )}
            {user?.address && (
              <span className="profile-pill">📍 {user.address}</span>
            )}
            {user?.vehicleType && (
              <span className="profile-pill">🛵 Vehicle: {user.vehicleType}</span>
            )}
            {user?.rating && (
              <span className="profile-pill">⭐ {user.rating} Rating</span>
            )}
            {user?.totalDeliveries !== undefined && (
              <span className="profile-pill">📦 {user.totalDeliveries} Deliveries</span>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Forms Grid */}
      <div className="profile-forms-grid">
        {/* Personal Details Form */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <span className="section-card-icon">👤</span>
            <div>
              <h3>Personal Details</h3>
              <p>Update your personal and contact details</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-row-2col">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={profileForm.firstName}
                  required
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, firstName: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="disabled-input"
                title="Email cannot be changed"
              />
              <span className="field-hint">Primary account email cannot be edited.</span>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="01xxxxxxxxx"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>
                {role === "deliveryman" ? "Primary Delivery Zone" : "Default Delivery Address"}
              </label>
              <textarea
                rows="2"
                placeholder="Street address, apartment, city"
                value={profileForm.address}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, address: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              className="save-profile-btn"
              disabled={savingProfile}
            >
              {savingProfile ? "Saving Changes..." : "Save Details ✓"}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <span className="section-card-icon">🔒</span>
            <div>
              <h3>Security & Password</h3>
              <p>Update your account password anytime</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="form-group">
              <label>Current Password</label>
              <div className="input-with-eye">
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  required
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle"
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label="Toggle password visibility"
                >
                  {showCurrent ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="input-with-eye">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  required
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle"
                  onClick={() => setShowNew(!showNew)}
                  aria-label="Toggle password visibility"
                >
                  {showNew ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="input-with-eye">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Toggle password visibility"
                >
                  {showConfirm ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="password-checklist">
              <div className={`check-rule ${isMinLength ? "met" : ""}`}>
                {isMinLength ? "✓" : "○"} At least 6 characters
              </div>
              <div className={`check-rule ${isDifferent ? "met" : ""}`}>
                {isDifferent ? "✓" : "○"} Different from current password
              </div>
              <div className={`check-rule ${isMatch ? "met" : ""}`}>
                {isMatch ? "✓" : "○"} Passwords match
              </div>
            </div>

            <button
              type="submit"
              className="update-password-btn"
              disabled={changingPassword}
            >
              {changingPassword ? "Updating..." : "Update Password 🔒"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfileManager;
