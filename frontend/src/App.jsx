import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import Menu from "./pages/Menu/Menu";
import Login from "./pages/Login/Login";
import Register from "./pages/Login/Register";
import ForgotPassword from "./pages/Login/ForgotPassword";
import Profile from "./pages/Profile/Profile";
import Cart from "./pages/Cart/Cart";
import OrderHistory from "./pages/Orders/OrderHistory";
import OrderTracking from "./pages/Orders/OrderTracking";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import DeliveryDashboard from "./pages/Delivery/DeliveryDashboard";
import CustomerDashboard from "./pages/Customer/CustomerDashboard";
import About from "./pages/About/About";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import { AuthContext } from "./context/AuthContext";
import "./App.css";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const role = (user?.role || "").trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles?.map((value) => value.trim().toLowerCase());

  if (loading) {
    return (
      <div className="app-content" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🍽️</div>
          <div style={{ fontWeight: 600, color: "#64748b" }}>Loading session...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(role)) {
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "deliveryman") return <Navigate to="/delivery" replace />;
    return <Navigate to="/menu" replace />;
  }

  return children;
};

function App() {
  const { user } = useContext(AuthContext);
  const role = (user?.role || "").trim().toLowerCase();

  return (
    <div className="app">
      <Navbar />
      <div className="app-content">
        <Routes>
          <Route
            path="/"
            element={
              role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : role === "deliveryman" ? (
                <Navigate to="/delivery" replace />
              ) : user ? (
                <Navigate to="/customer" replace />
              ) : (
                <Navigate to="/menu" replace />
              )
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <OrderHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute allowedRoles={["user", "admin"]}>
                <OrderTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery"
            element={
              <ProtectedRoute allowedRoles={["deliveryMan"]}>
                <DeliveryDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;
