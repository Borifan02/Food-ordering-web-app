import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getSocket } from "../../utils/socket";
import ConfirmModal from "../../components/Modal/ConfirmModal";
import UserProfileManager from "../../components/Profile/UserProfileManager";
import apiClient from "../../api/axios";
import "./AdminDashboard.css";

const emptyMenuItem = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  prepTime: "15-20 min",
  calories: 450,
  isFeatured: false,
};

const emptyCategory = { name: "" };

const emptyDeliveryMan = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  vehicleType: "Scooter",
};

const PAGE_SIZE = 8;

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "stats";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderPage, setOrderPage] = useState(1);

  // Driver Assignment Modal
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  // Categories State
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingCategoryData, setEditingCategoryData] = useState({ name: "", isActive: true });

  // Menu Items State
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState(emptyMenuItem);
  const [imageFile, setImageFile] = useState(null);
  const [editingMenuItemId, setEditingMenuItemId] = useState("");
  const [editingMenuItemData, setEditingMenuItemData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isAvailable: true,
  });
  const [editingMenuImage, setEditingMenuImage] = useState(null);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuPage, setMenuPage] = useState(1);

  // Delivery Fleet State
  const [deliveryMen, setDeliveryMen] = useState([]);
  const [newDeliveryMan, setNewDeliveryMan] = useState(emptyDeliveryMan);
  const [editingDeliveryId, setEditingDeliveryId] = useState("");
  const [editingDeliveryData, setEditingDeliveryData] = useState({
    name: "",
    phone: "",
    email: "",
    status: "available",
    vehicleType: "Scooter",
  });
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryPage, setDeliveryPage] = useState(1);

  // Confirm Modal state for deletions
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const isAdmin = (user?.role || "").trim().toLowerCase() === "admin";

  const assetBaseUrl = useMemo(() => {
    const configured = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    return configured.endsWith("/api") ? configured.slice(0, -4) : configured;
  }, []);

  const buildAssetUrl = (assetPath) => {
    if (!assetPath) return "";
    if (assetPath.startsWith("http")) return assetPath;
    return `${assetBaseUrl}${assetPath}`;
  };

  const paginate = (items, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  async function fetchOrders() {
    try {
      const res = await apiClient.get("/orders/all");
      setOrders(res.data || []);
    } catch (error) {
      console.error("Error fetching orders", error);
    }
  }

  async function fetchStats() {
    try {
      const res = await apiClient.get("/reports/dashboard");
      setDashboardStats(res.data);
    } catch (error) {
      console.error("Error fetching stats", error);
    }
  }

  async function fetchCategories(includeInactive = false) {
    try {
      const endpoint = includeInactive ? "/categories/all" : "/categories";
      const res = await apiClient.get(endpoint);
      setCategories(res.data || []);
    } catch (error) {
      console.error("Error fetching categories", error);
    }
  }

  async function fetchMenuItems() {
    try {
      const res = await apiClient.get("/menu/all");
      setMenuItems(res.data || []);
    } catch (error) {
      console.error("Error fetching menu items", error);
    }
  }

  async function fetchDeliveryMen() {
    try {
      const res = await apiClient.get("/delivery");
      setDeliveryMen(res.data || []);
    } catch (error) {
      console.error("Error fetching delivery men", error);
    }
  }

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      navigate("/menu");
      return;
    }

    fetchStats();
    fetchOrders();
    fetchCategories(true);
    fetchMenuItems();
    fetchDeliveryMen();

    // Socket.io Real-time admin listener
    const socket = getSocket();
    if (socket) {
      socket.emit("join-admin");
      socket.on("new-order", () => {
        toast.info("🔔 New order received from customer!");
        fetchOrders();
        fetchStats();
      });
      socket.on("order-status-changed", () => {
        fetchOrders();
        fetchStats();
      });
      socket.on("delivery-completed", () => {
        toast.success("📦 A delivery has been completed!");
        fetchOrders();
        fetchDeliveryMen();
        fetchStats();
      });
    }

    return () => {
      if (socket) {
        socket.off("new-order");
        socket.off("order-status-changed");
        socket.off("delivery-completed");
      }
    };
  }, [user, isAdmin, navigate]);

  // Order filters
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (orderStatusFilter !== "all") {
      result = result.filter(
        (o) => o.status?.toLowerCase() === orderStatusFilter.toLowerCase()
      );
    }
    const q = orderSearch.trim().toLowerCase();
    if (!q) return result;
    return result.filter((o) => {
      const id = o._id?.toLowerCase() || "";
      const customer = o.userId?.firstName?.toLowerCase() || "";
      const status = o.status?.toLowerCase() || "";
      return id.includes(q) || customer.includes(q) || status.includes(q);
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const category = item.categoryId?.name?.toLowerCase() || "";
      return name.includes(q) || category.includes(q);
    });
  }, [menuItems, menuSearch]);

  const filteredDeliveryMen = useMemo(() => {
    const q = deliverySearch.trim().toLowerCase();
    if (!q) return deliveryMen;
    return deliveryMen.filter((man) => {
      const name = man.name?.toLowerCase() || "";
      const email = man.email?.toLowerCase() || "";
      const phone = man.phone?.toLowerCase() || "";
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [deliveryMen, deliverySearch]);

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const menuTotalPages = Math.max(1, Math.ceil(filteredMenuItems.length / PAGE_SIZE));
  const deliveryTotalPages = Math.max(1, Math.ceil(filteredDeliveryMen.length / PAGE_SIZE));

  const safeOrderPage = Math.min(orderPage, orderTotalPages);
  const safeMenuPage = Math.min(menuPage, menuTotalPages);
  const safeDeliveryPage = Math.min(deliveryPage, deliveryTotalPages);

  const pagedOrders = paginate(filteredOrders, safeOrderPage);
  const pagedMenuItems = paginate(filteredMenuItems, safeMenuPage);
  const pagedDeliveryMen = paginate(filteredDeliveryMen, safeDeliveryPage);

  // Status Change logic
  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === "onTheWay") {
      const targetOrder = orders.find((o) => o._id === orderId);
      setAssignModalOrder(targetOrder || { _id: orderId });
      setSelectedDriverId("");
      return;
    }

    try {
      if (newStatus === "delivered") {
        await apiClient.post(`/delivery/complete/${orderId}`);
      } else {
        await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      }
      toast.success(`Order #${orderId.substring(0, 8)} status moved to ${newStatus}`);
      await fetchOrders();
      await fetchDeliveryMen();
      await fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order status");
    }
  };

  // Submit Driver Assignment
  const handleConfirmDriverAssign = async () => {
    if (!assignModalOrder) return;
    try {
      await apiClient.post(`/delivery/assign/${assignModalOrder._id}`, {
        deliveryManId: selectedDriverId || undefined,
      });
      toast.success("Delivery partner assigned & order is on the way! 🛵");
      setAssignModalOrder(null);
      await fetchOrders();
      await fetchDeliveryMen();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign delivery driver");
    }
  };

  // Quick Inline Toggle for Menu Item Availability
  const toggleItemAvailability = async (item) => {
    try {
      const updated = !item.isAvailable;
      await apiClient.put(`/menu/${item._id}`, { isAvailable: updated });
      toast.success(`"${item.name}" is now ${updated ? "Available" : "Unavailable"}`);
      await fetchMenuItems();
    } catch {
      toast.error("Failed to update availability");
    }
  };

  // Menu Items Add / Save / Delete
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      toast.warning("Please upload a food image");
      return;
    }

    const formData = new FormData();
    formData.append("name", newItem.name);
    formData.append("description", newItem.description);
    formData.append("price", newItem.price);
    formData.append("categoryId", newItem.categoryId);
    formData.append("prepTime", newItem.prepTime);
    formData.append("calories", newItem.calories);
    formData.append("image", imageFile);

    try {
      await apiClient.post("/menu", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewItem(emptyMenuItem);
      setImageFile(null);
      await fetchMenuItems();
      toast.success("New dish added to menu successfully! 🍽️");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create menu item");
    }
  };

  const startEditMenuItem = (item) => {
    setEditingMenuItemId(item._id);
    setEditingMenuItemData({
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId?._id || item.categoryId,
      isAvailable: item.isAvailable,
    });
    setEditingMenuImage(null);
  };

  const saveMenuItem = async (id) => {
    try {
      const formData = new FormData();
      formData.append("name", editingMenuItemData.name);
      formData.append("description", editingMenuItemData.description);
      formData.append("price", editingMenuItemData.price);
      formData.append("categoryId", editingMenuItemData.categoryId);
      formData.append("isAvailable", editingMenuItemData.isAvailable);
      if (editingMenuImage) {
        formData.append("image", editingMenuImage);
      }

      await apiClient.put(`/menu/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setEditingMenuItemId("");
      setEditingMenuImage(null);
      await fetchMenuItems();
      toast.success("Menu item updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update menu item");
    }
  };

  const deleteMenuItem = (id, name) => {
    setDeleteModal({
      isOpen: true,
      title: "Delete Menu Item",
      message: `Are you sure you want to delete "${name}"? It will be permanently removed from the menu.`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/menu/${id}`);
          await fetchMenuItems();
          setDeleteModal((prev) => ({ ...prev, isOpen: false }));
          toast.success("Menu item deleted");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete item");
        }
      },
    });
  };

  // Categories Add / Edit / Delete
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryImageFile) {
      toast.warning("Please upload a category image");
      return;
    }

    const formData = new FormData();
    formData.append("name", newCategory.name);
    formData.append("image", categoryImageFile);

    try {
      await apiClient.post("/categories/add-category", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewCategory(emptyCategory);
      setCategoryImageFile(null);
      await fetchCategories(true);
      toast.success("Category created successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add category");
    }
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setEditingCategoryData({ name: category.name, isActive: category.isActive });
    setCategoryImageFile(null);
  };

  const saveCategory = async (id) => {
    try {
      const formData = new FormData();
      formData.append("name", editingCategoryData.name);
      formData.append("isActive", editingCategoryData.isActive);
      if (categoryImageFile) {
        formData.append("image", categoryImageFile);
      }

      await apiClient.put(`/categories/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setEditingCategoryId("");
      setCategoryImageFile(null);
      await fetchCategories(true);
      toast.success("Category updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update category");
    }
  };

  const deleteCategory = (id, name) => {
    setDeleteModal({
      isOpen: true,
      title: "Delete Category",
      message: `Delete category "${name}"? Dishes in this category will need reassignment.`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/categories/${id}`);
          await fetchCategories(true);
          setDeleteModal((prev) => ({ ...prev, isOpen: false }));
          toast.success("Category deleted");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete category");
        }
      },
    });
  };

  // PDF Report Download
  const handleDownloadPDF = async () => {
    try {
      toast.info("Generating official PDF sales report...");
      const response = await apiClient.get("/reports/export-pdf", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `foodie_sales_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully! 📄");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to download PDF report");
    }
  };

  // Delivery Men Add / Edit / Delete
  const handleAddDeliveryMan = async (e) => {
    e.preventDefault();

    if (newDeliveryMan.password !== newDeliveryMan.confirmPassword) {
      toast.warning("Passwords do not match");
      return;
    }
    const cleanPhone = (newDeliveryMan.phone || "").replace(/[\s\-()]/g, "");
    const ethiopianPhoneRegex = /^(\+251|251|0)?[79]\d{8}$/;
    if (!ethiopianPhoneRegex.test(cleanPhone)) {
      toast.warning("Please enter a valid Ethiopian phone number (e.g. 0911234567 or +251911234567)");
      return;
    }

    try {
      await apiClient.post("/delivery/add", newDeliveryMan);
      setNewDeliveryMan(emptyDeliveryMan);
      await fetchDeliveryMen();
      toast.success("Delivery personnel account created! 🚚");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add delivery personnel");
    }
  };

  const startEditDelivery = (man) => {
    setEditingDeliveryId(man._id);
    setEditingDeliveryData({
      name: man.name,
      phone: man.phone,
      email: man.email,
      status: man.status,
      vehicleType: man.vehicleType || "Scooter",
    });
  };

  const saveDelivery = async (id) => {
    try {
      await apiClient.put(`/delivery/${id}`, editingDeliveryData);
      setEditingDeliveryId("");
      await fetchDeliveryMen();
      toast.success("Delivery account updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update delivery account");
    }
  };

  const deleteDelivery = (id, name) => {
    setDeleteModal({
      isOpen: true,
      title: "Remove Delivery Personnel",
      message: `Are you sure you want to remove ${name} from the delivery fleet?`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/delivery/${id}`);
          await fetchDeliveryMen();
          setDeleteModal((prev) => ({ ...prev, isOpen: false }));
          toast.success("Delivery partner removed");
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to remove delivery driver");
        }
      },
    });
  };

  if (!isAdmin) return null;

  const renderPager = (page, totalPages, onPageChange) => (
    <div className="table-pagination">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="pager-btn"
      >
        &larr; Prev
      </button>
      <span className="pager-text">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="pager-btn"
      >
        Next &rarr;
      </button>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-header-row">
        <div>
          <h1>Administration Dashboard 👑</h1>
          <p className="admin-subtitle">
            Welcome back, {user?.firstName}! Complete control over store orders, menu, and fleet.
          </p>
        </div>

        <button className="download-report-top-btn" onClick={handleDownloadPDF}>
          📄 Export PDF Report
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={activeTab === "stats" ? "active" : ""}
          onClick={() => setActiveTab("stats")}
        >
          📊 Analytics & Sales
        </button>
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          📦 Orders ({orders.length})
        </button>
        <button
          className={activeTab === "menu" ? "active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          🍔 Menu Catalog ({menuItems.length})
        </button>
        <button
          className={activeTab === "categories" ? "active" : ""}
          onClick={() => setActiveTab("categories")}
        >
          🏷️ Categories ({categories.length})
        </button>
        <button
          className={activeTab === "delivery" ? "active" : ""}
          onClick={() => setActiveTab("delivery")}
        >
          🚚 Fleet ({deliveryMen.length})
        </button>
        <button
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => setActiveTab("profile")}
        >
          👤 Profile & Security
        </button>
      </div>

      {/* STATS TAB */}
      {activeTab === "stats" && (
        <div className="stats-tab-content">
          {dashboardStats ? (
            <>
              <div className="kpi-cards-grid">
                <div className="kpi-card revenue">
                  <span className="kpi-icon">💰</span>
                  <div className="kpi-info">
                    <span className="kpi-label">Total Revenue</span>
                    <h3 className="kpi-value">{Number(dashboardStats.totalRevenue || 0).toFixed(2)} ETB</h3>
                    <span className="kpi-trend positive">+14.2% from last week</span>
                  </div>
                </div>

                <div className="kpi-card orders">
                  <span className="kpi-icon">📦</span>
                  <div className="kpi-info">
                    <span className="kpi-label">Total Orders</span>
                    <h3 className="kpi-value">{dashboardStats.totalOrders || 0}</h3>
                    <span className="kpi-trend neutral">All-time completed</span>
                  </div>
                </div>

                <div className="kpi-card pending">
                  <span className="kpi-icon">⏳</span>
                  <div className="kpi-info">
                    <span className="kpi-label">Pending Orders</span>
                    <h3 className="kpi-value">{dashboardStats.pendingOrders || 0}</h3>
                    <span className="kpi-trend alert">Requires kitchen action</span>
                  </div>
                </div>

                <div className="kpi-card fleet">
                  <span className="kpi-icon">🛵</span>
                  <div className="kpi-info">
                    <span className="kpi-label">Active Drivers</span>
                    <h3 className="kpi-value">
                      {deliveryMen.filter((d) => d.status === "available").length} / {deliveryMen.length}
                    </h3>
                    <span className="kpi-trend positive">Fleet ready</span>
                  </div>
                </div>
              </div>

              {/* Top Selling Items Table */}
              {dashboardStats.topSellingItems?.length > 0 && (
                <div className="admin-card-box">
                  <h3>🔥 Top 5 Best-Selling Dishes</h3>
                  <div className="top-sellers-grid">
                    {dashboardStats.topSellingItems.map((item, idx) => (
                      <div key={idx} className="seller-chip">
                        <span className="seller-rank">#{idx + 1}</span>
                        <div className="seller-name">{item._id}</div>
                        <span className="seller-sold">{item.totalSold} sold</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Sales Table */}
              <div className="admin-card-box">
                <h3>📅 Daily Sales Performance (Recent)</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Revenue</th>
                      <th>Order Count</th>
                      <th>Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardStats.dailyStats?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center">No daily sales records yet</td>
                      </tr>
                    ) : (
                      dashboardStats.dailyStats?.map((d) => (
                        <tr key={d._id}>
                          <td><strong>{d._id}</strong></td>
                          <td><span className="money-cell">{Number(d.dailyRevenue).toFixed(2)} ETB</span></td>
                          <td>{d.orderCount} orders</td>
                          <td>
                            {(d.dailyRevenue / Math.max(1, d.orderCount)).toFixed(2)} ETB
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="admin-loading">Loading statistics...</div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="orders-tab-content">
          <div className="order-filter-bar">
            <div className="status-pill-filters">
              {["all", "pending", "Preparing", "onTheWay", "delivered", "cancelled"].map((st) => (
                <button
                  key={st}
                  className={`order-filter-pill ${orderStatusFilter === st ? "active" : ""}`}
                  onClick={() => {
                    setOrderStatusFilter(st);
                    setOrderPage(1);
                  }}
                >
                  {st === "all" ? "All Orders" : st}
                </button>
              ))}
            </div>

            <input
              className="admin-search-input"
              placeholder="Search by order ID, customer name, or status..."
              value={orderSearch}
              onChange={(e) => {
                setOrderSearch(e.target.value);
                setOrderPage(1);
              }}
            />
          </div>

          <div className="table-responsive-box">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Items</th>
                  <th>Status Progress</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">No orders match your search or filter</td>
                  </tr>
                ) : (
                  pagedOrders.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <span className="order-id-code">#{o._id.substring(0, 8)}</span>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <strong>{o.userId?.firstName || o.userId?.name || "Customer"}</strong>
                          <span className="sub-text">{o.userId?.phone || o.userId?.email || ""}</span>
                        </div>
                      </td>
                      <td>
                        <span className="address-cell" title={o.deliveryAddress}>
                          {o.deliveryAddress || "-"}
                        </span>
                      </td>
                      <td>
                        <span className="items-count-badge">
                          {o.items?.reduce((s, i) => s + i.quantity, 0) || o.items?.length || 0} items
                        </span>
                      </td>
                      <td>
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o._id, e.target.value)}
                          className={`status-select status-${o.status}`}
                        >
                          <option value="pending">pending (Order Placed)</option>
                          <option value="Preparing">Preparing (Kitchen)</option>
                          <option value="onTheWay">onTheWay (Assign Driver)</option>
                          <option value="delivered">delivered (Completed)</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td>
                        <strong>{Number(o.totalAmount).toFixed(2)} ETB</strong>
                      </td>
                      <td>
                        <span className="sub-text">
                          {new Date(o.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {renderPager(safeOrderPage, orderTotalPages, setOrderPage)}
        </div>
      )}

      {/* MENU TAB */}
      {activeTab === "menu" && (
        <div className="menu-tab-content">
          {/* Add Item Card */}
          <div className="admin-card-box">
            <h3>Add New Dish to Menu</h3>
            <form onSubmit={handleAddItem} className="admin-form-grid">
              <div className="form-group">
                <label>Dish Name *</label>
                <input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Truffle Mushroom Pizza"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Price (ETB) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="150.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Prep Time</label>
                <input
                  value={newItem.prepTime}
                  onChange={(e) => setNewItem({ ...newItem, prepTime: e.target.value })}
                  placeholder="15-20 min"
                />
              </div>

              <div className="form-group full-width">
                <label>Description *</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Fresh ingredients, signature seasoning, flavor highlights..."
                  rows={2}
                  required
                />
              </div>

              <div className="form-group">
                <label>Food Photo Upload *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div className="form-group submit-col">
                <button type="submit" className="admin-primary-btn">
                  + Add Dish to Menu
                </button>
              </div>
            </form>
          </div>

          {/* Manage Menu Table */}
          <div className="admin-card-box">
            <div className="table-header-controls">
              <h3>Manage Menu Items ({menuItems.length})</h3>
              <input
                className="admin-search-input"
                placeholder="Search dish or category..."
                value={menuSearch}
                onChange={(e) => {
                  setMenuSearch(e.target.value);
                  setMenuPage(1);
                }}
              />
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Dish</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Live Status</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedMenuItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <input
                          value={editingMenuItemData.name}
                          onChange={(e) =>
                            setEditingMenuItemData({ ...editingMenuItemData, name: e.target.value })
                          }
                          className="table-input"
                        />
                      ) : (
                        <strong>{item.name}</strong>
                      )}
                    </td>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <select
                          value={editingMenuItemData.categoryId}
                          onChange={(e) =>
                            setEditingMenuItemData({
                              ...editingMenuItemData,
                              categoryId: e.target.value,
                            })
                          }
                          className="table-input"
                        >
                          {categories.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        item.categoryId?.name || "-"
                      )}
                    </td>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editingMenuItemData.price}
                          onChange={(e) =>
                            setEditingMenuItemData({ ...editingMenuItemData, price: e.target.value })
                          }
                          className="table-input"
                        />
                      ) : (
                        `${Number(item.price).toFixed(2)} ETB`
                      )}
                    </td>
                    <td>
                      {/* In-Line Quick Availability Switch */}
                      <button
                        className={`availability-switch-btn ${item.isAvailable ? "on" : "off"}`}
                        onClick={() => toggleItemAvailability(item)}
                        title="Click to toggle availability"
                      >
                        {item.isAvailable ? "✓ Available" : "✕ Out of Stock"}
                      </button>
                    </td>
                    <td>
                      {item.image ? (
                        <img
                          src={buildAssetUrl(item.image)}
                          alt={item.name}
                          className="table-thumb"
                          onError={(e) => (e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100")}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <div className="action-btns-row">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setEditingMenuImage(e.target.files?.[0] || null)}
                          />
                          <button
                            className="btn-action save"
                            onClick={() => saveMenuItem(item._id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-action cancel"
                            onClick={() => setEditingMenuItemId("")}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="action-btns-row">
                          <button
                            className="btn-action edit"
                            onClick={() => startEditMenuItem(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-action delete"
                            onClick={() => deleteMenuItem(item._id, item.name)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPager(safeMenuPage, menuTotalPages, setMenuPage)}
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === "categories" && (
        <div className="categories-tab-content">
          <div className="admin-card-box">
            <h3>Add New Category</h3>
            <form onSubmit={handleAddCategory} className="admin-form-inline">
              <input
                value={newCategory.name}
                onChange={(e) => setNewCategory({ name: e.target.value })}
                placeholder="Category Name (e.g. Pasta, Tacos, Wraps)"
                required
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)}
                required
              />
              <button type="submit" className="admin-primary-btn">
                Add Category
              </button>
            </form>
          </div>

          <div className="admin-card-box">
            <h3>Manage Categories ({categories.length})</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Status</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id}>
                    <td>
                      {editingCategoryId === c._id ? (
                        <input
                          value={editingCategoryData.name}
                          onChange={(e) =>
                            setEditingCategoryData({ ...editingCategoryData, name: e.target.value })
                          }
                          className="table-input"
                        />
                      ) : (
                        <strong>{c.name}</strong>
                      )}
                    </td>
                    <td>
                      {editingCategoryId === c._id ? (
                        <select
                          value={String(editingCategoryData.isActive)}
                          onChange={(e) =>
                            setEditingCategoryData({
                              ...editingCategoryData,
                              isActive: e.target.value === "true",
                            })
                          }
                          className="table-input"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : c.isActive ? (
                        <span className="badge-active">Active</span>
                      ) : (
                        <span className="badge-inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      {c.image ? (
                        <img
                          src={buildAssetUrl(c.image)}
                          alt={c.name}
                          className="table-thumb"
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {editingCategoryId === c._id ? (
                        <div className="action-btns-row">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)}
                          />
                          <button
                            className="btn-action save"
                            onClick={() => saveCategory(c._id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-action cancel"
                            onClick={() => setEditingCategoryId("")}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="action-btns-row">
                          <button
                            className="btn-action edit"
                            onClick={() => startEditCategory(c)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-action delete"
                            onClick={() => deleteCategory(c._id, c.name)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DELIVERY FLEET TAB */}
      {activeTab === "delivery" && (
        <div className="fleet-tab-content">
          <div className="admin-card-box">
            <h3>Add Delivery Personnel</h3>
            <form onSubmit={handleAddDeliveryMan} className="admin-form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  value={newDeliveryMan.name}
                  onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, name: e.target.value })}
                  placeholder="e.g. Abebe Bikila"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number (Ethiopian) *</label>
                <input
                  value={newDeliveryMan.phone}
                  onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, phone: e.target.value })}
                  placeholder="09xxxxxxxx or +251 9xxxxxxxx"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={newDeliveryMan.email}
                  onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, email: e.target.value })}
                  placeholder="carlos@foodie.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select
                  value={newDeliveryMan.vehicleType}
                  onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, vehicleType: e.target.value })}
                >
                  <option value="Scooter">Scooter</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Car">Car</option>
                </select>
              </div>
              <div className="form-group">
                <label>Password (min 6 chars) *</label>
                <input
                  type="password"
                  value={newDeliveryMan.password}
                  onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={newDeliveryMan.confirmPassword}
                  onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group submit-col full-width">
                <button type="submit" className="admin-primary-btn">
                  + Create Delivery Account
                </button>
              </div>
            </form>
          </div>

          <div className="admin-card-box">
            <div className="table-header-controls">
              <h3>Fleet Drivers ({deliveryMen.length})</h3>
              <input
                className="admin-search-input"
                placeholder="Search by driver name, phone, email..."
                value={deliverySearch}
                onChange={(e) => {
                  setDeliverySearch(e.target.value);
                  setDeliveryPage(1);
                }}
              />
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Driver Name</th>
                  <th>Contact Info</th>
                  <th>Vehicle</th>
                  <th>Fleet Status</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedDeliveryMen.map((man) => (
                  <tr key={man._id}>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <input
                          value={editingDeliveryData.name}
                          onChange={(e) =>
                            setEditingDeliveryData({ ...editingDeliveryData, name: e.target.value })
                          }
                          className="table-input"
                        />
                      ) : (
                        <strong>{man.name}</strong>
                      )}
                    </td>
                    <td>
                      <div>{man.phone}</div>
                      <span className="sub-text">{man.email}</span>
                    </td>
                    <td>
                      <span className="vehicle-badge">{man.vehicleType || "Scooter"}</span>
                    </td>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <select
                          value={editingDeliveryData.status}
                          onChange={(e) =>
                            setEditingDeliveryData({ ...editingDeliveryData, status: e.target.value })
                          }
                          className="table-input"
                        >
                          <option value="available">available</option>
                          <option value="busy">busy</option>
                          <option value="offline">offline</option>
                        </select>
                      ) : (
                        <span className={`fleet-status-pill ${man.status}`}>
                          {man.status?.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td>★ {man.rating || "4.9"}</td>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <div className="action-btns-row">
                          <button
                            className="btn-action save"
                            onClick={() => saveDelivery(man._id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-action cancel"
                            onClick={() => setEditingDeliveryId("")}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="action-btns-row">
                          <button
                            className="btn-action edit"
                            onClick={() => startEditDelivery(man)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-action delete"
                            onClick={() => deleteDelivery(man._id, man.name)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renderPager(safeDeliveryPage, deliveryTotalPages, setDeliveryPage)}
          </div>
        </div>
      )}

      {/* PROFILE & SECURITY TAB */}
      {activeTab === "profile" && (
        <div className="admin-profile-tab-content">
          <UserProfileManager />
        </div>
      )}

      {/* Driver Assignment Modal */}
      {assignModalOrder && (
        <div className="modal-backdrop" onClick={() => setAssignModalOrder(null)}>
          <div
            className="driver-assign-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Assign Delivery Partner 🛵</h3>
            <p>
              Order #{assignModalOrder._id.substring(0, 8)} to {assignModalOrder.deliveryAddress}
            </p>

            <div className="driver-picker-list">
              <label
                className={`driver-picker-card ${!selectedDriverId ? "selected" : ""}`}
                onClick={() => setSelectedDriverId("")}
              >
                <input
                  type="radio"
                  name="driverSelect"
                  checked={!selectedDriverId}
                  onChange={() => setSelectedDriverId("")}
                />
                <div>
                  <strong>⚡ Auto-Assign Best Available Driver</strong>
                  <p>System picks the nearest available delivery personnel</p>
                </div>
              </label>

              {deliveryMen.map((d) => (
                <label
                  key={d._id}
                  className={`driver-picker-card ${selectedDriverId === d._id ? "selected" : ""} ${d.status !== "available" ? "disabled" : ""}`}
                  onClick={() => d.status === "available" && setSelectedDriverId(d._id)}
                >
                  <input
                    type="radio"
                    name="driverSelect"
                    checked={selectedDriverId === d._id}
                    disabled={d.status !== "available"}
                    onChange={() => setSelectedDriverId(d._id)}
                  />
                  <div>
                    <strong>{d.name} ({d.vehicleType || "Scooter"})</strong>
                    <p>Phone: {d.phone} • Status: {d.status.toUpperCase()}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="modal-actions-group">
              <button
                className="cancel-btn"
                onClick={() => setAssignModalOrder(null)}
              >
                Cancel
              </button>
              <button
                className="confirm-assign-btn"
                onClick={handleConfirmDriverAssign}
              >
                Assign & Dispatch Order ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default AdminDashboard;
