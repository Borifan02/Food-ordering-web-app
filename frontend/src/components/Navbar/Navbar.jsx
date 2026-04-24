import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { CartContext } from "../../context/CartContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const location = useLocation();

  // Always show navbar except on login/register pages
  if (["/login", "/register"].includes(location.pathname)) {
    return null;
  }

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/menu" className="logo">
          Foodie<span className="dot">.</span>
        </Link>
        <div className="nav-links">
          {user?.role === "admin" && (
            <Link to="/admin" className="nav-link">
              Admin Dashboard
            </Link>
          )}
          {user?.role === "deliveryMan" && (
            <Link to="/delivery" className="nav-link">
              Delivery Dashboard
            </Link>
          )}
          {user?.role === "user" && (
            <>
              <Link to="/menu" className="nav-link">
                Menu
              </Link>
              <Link to="/orders" className="nav-link">
                Orders
              </Link>
              <Link to="/cart" className="nav-link cart-link">
                Cart
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>
            </>
          )}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
