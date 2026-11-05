import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import UserProfileManager from "../../components/Profile/UserProfileManager";
import "./Profile.css";

const Profile = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const role = (user?.role || "").trim().toLowerCase();

  return (
    <div className="profile-page-container">
      <div className="profile-page-header">
        <div>
          <span className="profile-page-badge">⚙️ Account Settings</span>
          <h1>My Profile & Security</h1>
          <p>Manage your personal information, address, and login credentials</p>
        </div>

        <div className="profile-quick-nav">
          {role === "admin" && (
            <button
              className="quick-nav-btn admin-btn"
              onClick={() => navigate("/admin")}
            >
              👑 Go to Admin Dashboard
            </button>
          )}

          {role === "deliveryman" && (
            <button
              className="quick-nav-btn driver-btn"
              onClick={() => navigate("/delivery")}
            >
              🛵 Go to Delivery Hub
            </button>
          )}

          {role !== "admin" && role !== "deliveryman" && (
            <>
              <button
                className="quick-nav-btn secondary-btn"
                onClick={() => navigate("/orders")}
              >
                📦 My Orders
              </button>
              <button
                className="quick-nav-btn primary-btn"
                onClick={() => navigate("/menu")}
              >
                🍽️ Browse Menu
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profile-page-content">
        <UserProfileManager />
      </div>
    </div>
  );
};

export default Profile;

