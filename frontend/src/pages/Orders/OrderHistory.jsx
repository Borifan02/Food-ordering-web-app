import { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/axios";
import { CartContext } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import "./OrderHistory.css";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all"); // "all", "active", "delivered", "cancelled"
  const [receiptOrder, setReceiptOrder] = useState(null);

  const { reorderItems } = useContext(CartContext);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await apiClient.get("/orders");
        setOrders(data || []);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Could not load your orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const handleReorder = (order) => {
    reorderItems(order.items);
    toast.success("Items added to your cart! Taking you to checkout... 🛒");
    navigate("/cart");
  };

  const filteredOrders = useMemo(() => {
    if (filterTab === "active") {
      return orders.filter((o) =>
        ["pending", "Preparing", "onTheWay"].includes(o.status)
      );
    }
    if (filterTab === "delivered") {
      return orders.filter((o) => o.status === "delivered");
    }
    if (filterTab === "cancelled") {
      return orders.filter((o) => o.status === "cancelled");
    }
    return orders;
  }, [orders, filterTab]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return <span className="status-badge status-delivered">✓ Delivered</span>;
      case "onTheWay":
        return <span className="status-badge status-ontheway">🛵 Out for Delivery</span>;
      case "Preparing":
        return <span className="status-badge status-preparing">👨‍🍳 Preparing</span>;
      case "pending":
        return <span className="status-badge status-pending">📝 Order Placed</span>;
      case "cancelled":
        return <span className="status-badge status-cancelled">✕ Cancelled</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div>
          <h2>Your Orders 📦</h2>
          <p className="history-subtitle">View past meals, track live deliveries, or reorder with 1-click</p>
        </div>
        <button className="new-order-btn" onClick={() => navigate("/menu")}>
          + New Order
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="history-tabs-bar">
        <button
          className={`history-tab ${filterTab === "all" ? "active" : ""}`}
          onClick={() => setFilterTab("all")}
        >
          All Orders ({orders.length})
        </button>
        <button
          className={`history-tab ${filterTab === "active" ? "active" : ""}`}
          onClick={() => setFilterTab("active")}
        >
          Active ({orders.filter((o) => ["pending", "Preparing", "onTheWay"].includes(o.status)).length})
        </button>
        <button
          className={`history-tab ${filterTab === "delivered" ? "active" : ""}`}
          onClick={() => setFilterTab("delivered")}
        >
          Completed ({orders.filter((o) => o.status === "delivered").length})
        </button>
        <button
          className={`history-tab ${filterTab === "cancelled" ? "active" : ""}`}
          onClick={() => setFilterTab("cancelled")}
        >
          Cancelled ({orders.filter((o) => o.status === "cancelled").length})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders-card">
          <div className="no-orders-icon">🍽️</div>
          <h3>No orders found</h3>
          <p>
            {filterTab === "all"
              ? "You haven't placed any orders yet. Discover our fresh meals today!"
              : `No orders currently match the "${filterTab}" filter.`}
          </p>
          <button className="start-ordering-btn" onClick={() => navigate("/menu")}>
            Browse Menu & Order
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const isActive = ["pending", "Preparing", "onTheWay"].includes(order.status);

            return (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-id-group">
                    <span className="order-label">Order Reference</span>
                    <span className="order-id">#{order._id.substring(0, 8)}</span>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div>{getStatusBadge(order.status)}</div>
                </div>

                <div className="order-items-preview">
                  <div className="preview-items-list">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="preview-item-chip">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>
                  {order.deliveryAddress && (
                    <div className="order-address-snippet">
                      📍 {order.deliveryAddress}
                    </div>
                  )}
                </div>

                <div className="order-footer">
                  <div className="order-total-block">
                    <span className="total-label">Total Amount</span>
                    <span className="total-amount">${Number(order.totalAmount).toFixed(2)}</span>
                    <span className="payment-chip">
                      {order.payment?.method || "Cash"}
                    </span>
                  </div>

                  <div className="order-action-btns">
                    <button
                      className="receipt-btn"
                      onClick={() => setReceiptOrder(order)}
                    >
                      🧾 Receipt
                    </button>

                    <button
                      className="reorder-btn"
                      onClick={() => handleReorder(order)}
                    >
                      ↺ Reorder
                    </button>

                    {isActive && (
                      <button
                        className="track-btn"
                        onClick={() => navigate(`/orders/${order._id}`)}
                      >
                        🛵 Track Live
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt / Invoice Modal */}
      {receiptOrder && (
        <div className="modal-backdrop" onClick={() => setReceiptOrder(null)}>
          <div
            className="receipt-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="receipt-header">
              <div className="receipt-brand">
                <h3>Foodie Restaurant</h3>
                <p>123 Food Street, Downtown • Tel: +1 (555) 019-2834</p>
              </div>
              <button
                className="close-receipt-btn"
                onClick={() => setReceiptOrder(null)}
              >
                ×
              </button>
            </div>

            <div className="receipt-meta">
              <div>
                <strong>Order #:</strong> {receiptOrder._id}
              </div>
              <div>
                <strong>Date:</strong>{" "}
                {new Date(receiptOrder.createdAt).toLocaleString()}
              </div>
              <div>
                <strong>Customer:</strong>{" "}
                {receiptOrder.userId?.firstName || "Valued Customer"}
              </div>
              <div>
                <strong>Address:</strong> {receiptOrder.deliveryAddress}
              </div>
              <div>
                <strong>Payment:</strong> {receiptOrder.payment?.method || "Cash"}{" "}
                ({receiptOrder.payment?.status || "Pending"})
              </div>
            </div>

            <div className="receipt-items-table">
              <div className="receipt-row header">
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Price</span>
                <span className="text-right">Total</span>
              </div>
              {receiptOrder.items.map((i, idx) => (
                <div key={idx} className="receipt-row">
                  <span>{i.name}</span>
                  <span className="text-center">{i.quantity}</span>
                  <span className="text-right">${Number(i.price).toFixed(2)}</span>
                  <span className="text-right">
                    ${(Number(i.price) * Number(i.quantity)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="receipt-totals">
              <div className="receipt-total-row">
                <span>Subtotal</span>
                <span>
                  $
                  {receiptOrder.items
                    .reduce((sum, item) => sum + item.price * item.quantity, 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="receipt-total-row">
                <span>Delivery Fee</span>
                <span>${(receiptOrder.deliveryFee || 0).toFixed(2)}</span>
              </div>
              {receiptOrder.discountAmount > 0 && (
                <div className="receipt-total-row discount">
                  <span>Discount ({receiptOrder.couponCode || "Promo"})</span>
                  <span>-${receiptOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="receipt-total-row grand-total">
                <span>Grand Total</span>
                <span>${Number(receiptOrder.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="receipt-actions">
              <button
                className="print-btn"
                onClick={() => window.print()}
              >
                🖨️ Print Receipt
              </button>
              <button
                className="done-btn"
                onClick={() => setReceiptOrder(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
