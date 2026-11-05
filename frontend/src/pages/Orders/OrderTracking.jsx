import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../api/axios";
import { getSocket } from "../../utils/socket";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../../components/Modal/ConfirmModal";
import ReviewModal from "../../components/ReviewModal/ReviewModal";
import "./OrderTracking.css";

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: "📝", desc: "Restaurant has received your order" },
  { key: "Preparing", label: "Preparing in Kitchen", icon: "👨‍🍳", desc: "Chef is handcrafting your meal fresh" },
  { key: "onTheWay", label: "Out for Delivery", icon: "🛵", desc: "Driver is on the way to your address" },
  { key: "delivered", label: "Delivered", icon: "🍽️", desc: "Meal enjoyed! Bon appétit!" },
];

const OrderTracking = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemForReview, setSelectedItemForReview] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [mapProgress, setMapProgress] = useState(0.15);

  const { toast } = useToast();
  const navigate = useNavigate();
  const mapCanvasRef = useRef(null);

  const fetchOrder = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const { data } = await apiClient.get(`/orders/${id}`);
      setOrder(data);
    } catch (error) {
      console.error("Error fetching order:", error);
      if (!isBackground) toast.error("Could not load order details");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Socket.io Real-Time connection
    const socket = getSocket();
    if (socket) {
      socket.emit("join-order", id);

      socket.on("status-update", (data) => {
        if (data.orderId === id) {
          toast.info(`Order Status Updated: ${data.status.toUpperCase()}! 🚀`);
          fetchOrder(true);
        }
      });
    }

    // Polling fallback every 8 seconds
    const interval = setInterval(() => {
      fetchOrder(true);
    }, 8000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.emit("leave-order", id);
        socket.off("status-update");
      }
    };
  }, [id]);

  // Adjust simulated map progress depending on status
  useEffect(() => {
    if (!order) return;
    if (order.status === "pending") setMapProgress(0.1);
    else if (order.status === "Preparing") setMapProgress(0.35);
    else if (order.status === "onTheWay") setMapProgress(0.75);
    else if (order.status === "delivered") setMapProgress(1.0);
    else if (order.status === "cancelled") setMapProgress(0);
  }, [order?.status]);

  // Animated Route Canvas
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrame;
    let pulse = 0;

    const renderMap = () => {
      const width = (canvas.width = canvas.parentElement.clientWidth || 600);
      const height = (canvas.height = 180);

      // Background road map simulation
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (let x = 20; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 20; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Route Path curve
      const startX = 60;
      const startY = height / 2;
      const endX = width - 60;
      const endY = height / 2;
      const midX = width / 2;
      const midY = height / 2 - 25;

      // Road outline
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();

      // Progress active road line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const currentX = startX + (endX - startX) * mapProgress;
      const t = mapProgress;
      const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;

      ctx.quadraticCurveTo(startX + (midX - startX) * t, startY + (midY - startY) * t, currentX, currentY);
      ctx.strokeStyle = "#ff4757";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Restaurant Start Pin
      ctx.beginPath();
      ctx.arc(startX, startY, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("🏪", startX, startY);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("Kitchen", startX, startY + 24);

      // Customer Destination Pin
      pulse += 0.05;
      const pulseSize = 14 + Math.sin(pulse) * 4;
      ctx.beginPath();
      ctx.arc(endX, endY, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(endX, endY, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
      ctx.fillText("🏠", endX, endY);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("You", endX, endY + 24);

      // Scooter / Driver Icon position
      if (order?.status !== "delivered" && order?.status !== "cancelled") {
        ctx.beginPath();
        ctx.arc(currentX, currentY, 16, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = "16px sans-serif";
        ctx.fillText("🛵", currentX, currentY);
      }

      animationFrame = requestAnimationFrame(renderMap);
    };

    renderMap();

    return () => cancelAnimationFrame(animationFrame);
  }, [mapProgress, order?.status]);

  // Cancel order handler
  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await apiClient.post(`/orders/${id}/cancel`, {
        reason: "Customer requested cancellation",
      });
      toast.success("Order has been cancelled successfully");
      setShowCancelModal(false);
      fetchOrder(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="tracking-container">
        <div className="tracking-loading">
          <div className="spinner"></div>
          <p>Connecting to live order tracking...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="tracking-container">
        <div className="order-not-found">
          <h2>Order Not Found</h2>
          <p>The order you are looking for does not exist or has been removed.</p>
          <button className="back-btn" onClick={() => navigate("/orders")}>
            Return to Order History
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="tracking-container">
      <div className="tracking-top-nav">
        <button className="back-btn" onClick={() => navigate("/orders")}>
          &larr; Back to Orders
        </button>
        <span className="live-status-indicator">
          <span className="live-pulse"></span> Live Real-Time Tracking
        </span>
      </div>

      <div className="tracking-header-card">
        <div className="header-order-info">
          <span className="order-chip">Order #{order._id.substring(0, 8)}</span>
          <h2>
            {isCancelled
              ? "Order Cancelled"
              : order.status === "delivered"
              ? "Order Delivered! 🎉"
              : "Order is On Track 🚀"}
          </h2>
          <p className="order-timestamp">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {!isCancelled && order.status !== "delivered" && (
          <div className="eta-badge-card">
            <span className="eta-label">Estimated Delivery</span>
            <span className="eta-time">~25 - 35 mins</span>
          </div>
        )}
      </div>

      {/* Simulated Live Route Map */}
      <div className="tracking-map-container">
        <canvas ref={mapCanvasRef} className="tracking-map-canvas"></canvas>
        <div className="map-legend-bar">
          <span>📍 From: Kitchen</span>
          <span>🛵 Driver: {order.deliveryManId?.name || "Assigning driver"}</span>
          <span>🏠 To: {order.deliveryAddress}</span>
        </div>
      </div>

      {/* Cancelled Banner */}
      {isCancelled ? (
        <div className="cancelled-banner">
          <span className="cancel-icon">⚠️</span>
          <div>
            <h4>This order was cancelled</h4>
            <p>{order.cancellationReason || "Cancelled upon customer request"}</p>
          </div>
        </div>
      ) : (
        /* Multi-Stage Visual Tracking Stepper */
        <div className="timeline-stepper">
          {statusSteps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={step.key}
                className={`timeline-step ${
                  isCompleted ? "completed" : isCurrent ? "current" : "upcoming"
                }`}
              >
                <div className="step-circle">
                  {isCompleted ? "✓" : step.icon}
                </div>
                <div className="step-text-group">
                  <span className="step-label">{step.label}</span>
                  <span className="step-desc">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Information Card (when assigned) */}
      {order.deliveryManId && !isCancelled && (
        <div className="driver-info-card">
          <div className="driver-avatar-box">🛵</div>
          <div className="driver-text-details">
            <span className="driver-role-tag">Your Delivery Partner</span>
            <h4>{order.deliveryManId.name || "Delivery Partner"}</h4>
            <p>
              Vehicle: {order.deliveryManId.vehicleType || "Scooter"} • Rating: ★ {order.deliveryManId.rating || "4.9"}
            </p>
          </div>
          {order.deliveryManId.phone && (
            <a
              href={`tel:${order.deliveryManId.phone}`}
              className="driver-call-btn"
            >
              📞 Call Driver
            </a>
          )}
        </div>
      )}

      {/* Customer Cancel Order Action (only for pending orders) */}
      {order.status === "pending" && (
        <div className="order-cancel-section">
          <p>Need to make changes? You can cancel your order while it is still pending.</p>
          <button
            className="cancel-order-outline-btn"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel Order ✕
          </button>
        </div>
      )}

      {/* Order Summary & Items List */}
      <div className="order-items-breakdown-card">
        <h3>Order Items ({order.items.length})</h3>

        <div className="items-table">
          {order.items.map((item, idx) => (
            <div key={idx} className="tracking-item-row">
              <div className="tracking-item-left">
                <span className="item-qty-badge">{item.quantity}x</span>
                <div>
                  <div className="tracking-item-name">{item.name}</div>
                  <div className="tracking-item-price">{Number(item.price).toFixed(2)} ETB each</div>
                </div>
              </div>

              <div className="tracking-item-right">
                <span className="item-row-total-price">
                  {(item.price * item.quantity).toFixed(2)} ETB
                </span>

                {/* Show review button if delivered */}
                {order.status === "delivered" && (
                  <button
                    className="rate-item-pill-btn"
                    onClick={() =>
                      setSelectedItemForReview({
                        menuItemId: item.menuItemId?._id || item.menuItemId || item._id,
                        name: item.name,
                      })
                    }
                  >
                    ★ Rate & Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Totals */}
        <div className="tracking-totals-box">
          <div className="totals-row">
            <span>Payment Method</span>
            <span>{order.payment?.method || "Cash"} ({order.payment?.status || "Pending"})</span>
          </div>
          {order.orderNotes && (
            <div className="totals-row">
              <span>Delivery Instructions</span>
              <span className="note-text">"{order.orderNotes}"</span>
            </div>
          )}
          <div className="totals-row total-highlight">
            <span>Total Amount</span>
            <span>{Number(order.totalAmount).toFixed(2)} ETB</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Order Cancellation */}
      <ConfirmModal
        isOpen={showCancelModal}
        title="Cancel This Order?"
        message="Are you sure you want to cancel your order? The kitchen will be notified immediately."
        confirmText={cancelling ? "Cancelling..." : "Yes, Cancel Order"}
        cancelText="Keep My Order"
        type="danger"
        onConfirm={handleCancelOrder}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Review Modal for Delivered Items */}
      {selectedItemForReview && (
        <ReviewModal
          orderId={order._id}
          menuItem={selectedItemForReview}
          onClose={() => setSelectedItemForReview(null)}
        />
      )}
    </div>
  );
};

export default OrderTracking;
