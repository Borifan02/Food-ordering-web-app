import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import apiClient from "../../api/axios";
import "./AdminDashboard.css";

const emptyMenuItem = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
};

const emptyCategory = { name: "" };

const emptyDeliveryMan = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const PAGE_SIZE = 8;

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stats");

  const [orders, setOrders] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingCategoryData, setEditingCategoryData] = useState({ name: "", isActive: true });

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

  const [deliveryMen, setDeliveryMen] = useState([]);
  const [newDeliveryMan, setNewDeliveryMan] = useState(emptyDeliveryMan);
  const [editingDeliveryId, setEditingDeliveryId] = useState("");
  const [editingDeliveryData, setEditingDeliveryData] = useState({
    name: "",
    phone: "",
    email: "",
    status: "available",
  });
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryPage, setDeliveryPage] = useState(1);

  const isAdmin = user?.role === "admin";

  const assetBaseUrl = useMemo(() => {
    const configured = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    return configured.endsWith("/api") ? configured.slice(0, -4) : configured;
  }, []);

  const buildAssetUrl = (assetPath) => {
    if (!assetPath) {
      return "";
    }
    if (assetPath.startsWith("http")) {
      return assetPath;
    }
    return `${assetBaseUrl}${assetPath}`;
  };

  const paginate = (items, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const id = o._id?.toLowerCase() || "";
      const customer = o.userId?.firstName?.toLowerCase() || "";
      const status = o.status?.toLowerCase() || "";
      return id.includes(q) || customer.includes(q) || status.includes(q);
    });
  }, [orders, orderSearch]);

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

  async function fetchOrders() {
    try {
      const res = await apiClient.get("/orders/all");
      setOrders(res.data);
    } catch (error) {
      console.error("Error fetching orders", error);
    }
  }

  async function fetchCategories(includeInactive = false) {
    try {
      const endpoint = includeInactive ? "/categories/all" : "/categories";
      const res = await apiClient.get(endpoint);
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories", error);
    }
  }

  async function fetchMenuItems() {
    try {
      const res = await apiClient.get("/menu/all");
      setMenuItems(res.data);
    } catch (error) {
      console.error("Error fetching menu items", error);
    }
  }

  async function fetchDeliveryMen() {
    try {
      const res = await apiClient.get("/delivery");
      setDeliveryMen(res.data);
    } catch (error) {
      console.error("Error fetching delivery men", error);
    }
  }

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isAdmin) {
      navigate("/menu");
      return;
    }

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [statsRes, ordersRes, categoriesRes, menuRes, deliveryRes] = await Promise.all([
          apiClient.get("/reports/dashboard"),
          apiClient.get("/orders/all"),
          apiClient.get("/categories/all"),
          apiClient.get("/menu/all"),
          apiClient.get("/delivery"),
        ]);

        if (!isMounted) return;

        setDashboardStats(statsRes.data);
        setOrders(ordersRes.data);
        setCategories(categoriesRes.data);
        setMenuItems(menuRes.data);
        setDeliveryMen(deliveryRes.data);
      } catch (error) {
        console.error("Error loading admin dashboard data", error);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [user, isAdmin, navigate]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      alert("Please upload an image");
      return;
    }

    const formData = new FormData();
    formData.append("name", newItem.name);
    formData.append("description", newItem.description);
    formData.append("price", newItem.price);
    formData.append("categoryId", newItem.categoryId);
    formData.append("image", imageFile);

    try {
      await apiClient.post("/menu", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewItem(emptyMenuItem);
      setImageFile(null);
      await fetchMenuItems();
      alert("Menu item created successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create menu item");
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
      alert("Menu item updated");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update menu item");
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete this menu item?")) {
      return;
    }

    try {
      await apiClient.delete(`/menu/${id}`);
      await fetchMenuItems();
      alert("Menu item deleted");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete menu item");
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryImageFile) {
      alert("Please upload a category image");
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
      alert("Category created successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add category");
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
      alert("Category updated");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update category");
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) {
      return;
    }

    try {
      await apiClient.delete(`/categories/${id}`);
      await fetchCategories(true);
      alert("Category deleted");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete category");
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      if (newStatus === "onTheWay") {
        await apiClient.post(`/delivery/assign/${orderId}`);
      } else if (newStatus === "delivered") {
        await apiClient.post(`/delivery/complete/${orderId}`);
      } else {
        await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      }
      await fetchOrders();
      await fetchDeliveryMen();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update order status");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.get("/reports/export-pdf", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "dashboard_report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to download report");
    }
  };

  const handleAddDeliveryMan = async (e) => {
    e.preventDefault();

    if (newDeliveryMan.password !== newDeliveryMan.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      await apiClient.post("/delivery/add", newDeliveryMan);
      setNewDeliveryMan(emptyDeliveryMan);
      await fetchDeliveryMen();
      alert("Delivery personnel account created");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add delivery man");
    }
  };

  const startEditDelivery = (man) => {
    setEditingDeliveryId(man._id);
    setEditingDeliveryData({
      name: man.name,
      phone: man.phone,
      email: man.email,
      status: man.status,
    });
  };

  const saveDelivery = async (id) => {
    try {
      await apiClient.put(`/delivery/${id}`, editingDeliveryData);
      setEditingDeliveryId("");
      await fetchDeliveryMen();
      alert("Delivery personnel updated");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update delivery account");
    }
  };

  const deleteDelivery = async (id) => {
    if (!window.confirm("Delete this delivery account?")) {
      return;
    }

    try {
      await apiClient.delete(`/delivery/${id}`);
      await fetchDeliveryMen();
      alert("Delivery personnel deleted");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete delivery account");
    }
  };

  if (!isAdmin) {
    return null;
  }

  const renderPager = (page, totalPages, onPageChange) => (
    <div className="table-pagination">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
      <span>{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );

  return (
    <div className="admin-container">
      <h1>Dashboard: {user?.firstName}</h1>

      <div className="admin-tabs">
        <button className={activeTab === "stats" ? "active" : ""} onClick={() => setActiveTab("stats")}>Stats</button>
        <button className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>Orders</button>
        <button className={activeTab === "menu" ? "active" : ""} onClick={() => setActiveTab("menu")}>Menu</button>
        <button className={activeTab === "categories" ? "active" : ""} onClick={() => setActiveTab("categories")}>Categories</button>
        <button className={activeTab === "delivery" ? "active" : ""} onClick={() => setActiveTab("delivery")}>Delivery</button>
      </div>

      {activeTab === "stats" && (
        <div className="stats-grid">
          {dashboardStats && (
            <>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button className="submit-btn" style={{ width: "auto" }} onClick={handleDownloadPDF}>Download PDF Report</button>
              </div>
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <p>${dashboardStats.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <h3>Total Orders</h3>
                <p>{dashboardStats.totalOrders}</p>
              </div>
              <div className="stat-card warning">
                <h3>Pending Orders</h3>
                <p>{dashboardStats.pendingOrders}</p>
              </div>
              <div className="stat-card" style={{ gridColumn: "1 / -1", alignItems: "stretch" }}>
                <h3>Daily Stats</h3>
                <table className="orders-table">
                  <thead>
                    <tr><th>Date</th><th>Revenue</th><th>Orders</th></tr>
                  </thead>
                  <tbody>
                    {dashboardStats.dailyStats.map((d) => (
                      <tr key={d._id}>
                        <td>{d._id}</td>
                        <td>${d.dailyRevenue.toFixed(2)}</td>
                        <td>{d.orderCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div className="orders-view">
          <h2>Order Management</h2>
          <input
            className="admin-search"
            placeholder="Search by order id, customer, or status"
            value={orderSearch}
            onChange={(e) => {
              setOrderSearch(e.target.value);
              setOrderPage(1);
            }}
          />
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {pagedOrders.map((o) => (
                <tr key={o._id}>
                  <td>{o._id.substring(0, 8)}</td>
                  <td>{o.userId?.firstName || "N/A"}</td>
                  <td>
                    <select value={o.status} onChange={(e) => handleStatusChange(o._id, e.target.value)} className={`status-select ${o.status}`}>
                      <option value="pending">Pending</option>
                      <option value="Preparing">Preparing</option>
                      <option value="onTheWay">On The Way</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>${Number(o.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {renderPager(safeOrderPage, orderTotalPages, setOrderPage)}
        </div>
      )}

      {activeTab === "menu" && (
        <div className="menu-management">
          <div className="form-card">
            <h2>Add Menu Item</h2>
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label>Name</label>
                <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>
                  <input type="number" min="0" step="0.01" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={newItem.categoryId} onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })} required>
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} required />
              </div>
              <button type="submit" className="submit-btn">Add Menu Item</button>
            </form>
          </div>

          <div className="orders-view" style={{ marginTop: "30px" }}>
            <h2>Manage Menu Items</h2>
            <input
              className="admin-search"
              placeholder="Search by menu item or category"
              value={menuSearch}
              onChange={(e) => {
                setMenuSearch(e.target.value);
                setMenuPage(1);
              }}
            />
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedMenuItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <input value={editingMenuItemData.name} onChange={(e) => setEditingMenuItemData({ ...editingMenuItemData, name: e.target.value })} />
                      ) : item.name}
                    </td>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <select value={editingMenuItemData.categoryId} onChange={(e) => setEditingMenuItemData({ ...editingMenuItemData, categoryId: e.target.value })}>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                          ))}
                        </select>
                      ) : (item.categoryId?.name || "-")}
                    </td>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <input type="number" min="0" step="0.01" value={editingMenuItemData.price} onChange={(e) => setEditingMenuItemData({ ...editingMenuItemData, price: e.target.value })} />
                      ) : `$${Number(item.price).toFixed(2)}`}
                    </td>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <select value={String(editingMenuItemData.isAvailable)} onChange={(e) => setEditingMenuItemData({ ...editingMenuItemData, isAvailable: e.target.value === "true" })}>
                          <option value="true">Available</option>
                          <option value="false">Unavailable</option>
                        </select>
                      ) : (item.isAvailable ? "Available" : "Unavailable")}
                    </td>
                    <td>
                      {item.image ? (
                        <img className="table-thumb" src={buildAssetUrl(item.image)} alt={item.name} />
                      ) : "No Image"}
                    </td>
                    <td>
                      {editingMenuItemId === item._id ? (
                        <div className="action-group">
                          <input type="file" accept="image/*" onChange={(e) => setEditingMenuImage(e.target.files?.[0] || null)} />
                          <button className="table-action save" onClick={() => saveMenuItem(item._id)}>Save</button>
                          <button className="table-action" onClick={() => setEditingMenuItemId("")}>Cancel</button>
                        </div>
                      ) : (
                        <div className="action-group">
                          <button className="table-action" onClick={() => startEditMenuItem(item)}>Edit</button>
                          <button className="table-action danger" onClick={() => deleteMenuItem(item._id)}>Delete</button>
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

      {activeTab === "categories" && (
        <div className="menu-management">
          <div className="form-card">
            <h2>Add Category</h2>
            <form onSubmit={handleAddCategory}>
              <div className="form-group">
                <label>Category Name</label>
                <input value={newCategory.name} onChange={(e) => setNewCategory({ name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)} required />
              </div>
              <button type="submit" className="submit-btn">Add Category</button>
            </form>
          </div>

          <div className="orders-view" style={{ marginTop: "30px" }}>
            <h2>Manage Categories</h2>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id}>
                    <td>
                      {editingCategoryId === cat._id ? (
                        <input value={editingCategoryData.name} onChange={(e) => setEditingCategoryData({ ...editingCategoryData, name: e.target.value })} />
                      ) : cat.name}
                    </td>
                    <td>
                      {editingCategoryId === cat._id ? (
                        <select value={String(editingCategoryData.isActive)} onChange={(e) => setEditingCategoryData({ ...editingCategoryData, isActive: e.target.value === "true" })}>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (cat.isActive ? "Active" : "Inactive")}
                    </td>
                    <td>
                      {cat.image ? <img className="table-thumb" src={buildAssetUrl(cat.image)} alt={cat.name} /> : "No Image"}
                    </td>
                    <td>
                      {editingCategoryId === cat._id ? (
                        <div className="action-group">
                          <input type="file" accept="image/*" onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)} />
                          <button className="table-action save" onClick={() => saveCategory(cat._id)}>Save</button>
                          <button className="table-action" onClick={() => setEditingCategoryId("")}>Cancel</button>
                        </div>
                      ) : (
                        <div className="action-group">
                          <button className="table-action" onClick={() => startEditCategory(cat)}>Edit</button>
                          <button className="table-action danger" onClick={() => deleteCategory(cat._id)}>Delete</button>
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

      {activeTab === "delivery" && (
        <div className="menu-management">
          <div className="form-card">
            <h2>Add Delivery Personnel</h2>
            <form onSubmit={handleAddDeliveryMan}>
              <div className="form-group"><label>Name</label><input value={newDeliveryMan.name} onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, name: e.target.value })} required /></div>
              <div className="form-group"><label>Phone</label><input value={newDeliveryMan.phone} onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, phone: e.target.value })} required /></div>
              <div className="form-group"><label>Email</label><input type="email" value={newDeliveryMan.email} onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, email: e.target.value })} required /></div>
              <div className="form-group"><label>Password</label><input type="password" minLength="6" value={newDeliveryMan.password} onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, password: e.target.value })} required /></div>
              <div className="form-group"><label>Confirm Password</label><input type="password" minLength="6" value={newDeliveryMan.confirmPassword} onChange={(e) => setNewDeliveryMan({ ...newDeliveryMan, confirmPassword: e.target.value })} required /></div>
              <button type="submit" className="submit-btn">Add Delivery Personnel</button>
            </form>
          </div>

          <div className="orders-view" style={{ marginTop: "30px" }}>
            <h2>Manage Delivery Personnel</h2>
            <input
              className="admin-search"
              placeholder="Search by name, email, or phone"
              value={deliverySearch}
              onChange={(e) => {
                setDeliverySearch(e.target.value);
                setDeliveryPage(1);
              }}
            />
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedDeliveryMen.map((man) => (
                  <tr key={man._id}>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <input value={editingDeliveryData.name} onChange={(e) => setEditingDeliveryData({ ...editingDeliveryData, name: e.target.value })} />
                      ) : man.name}
                    </td>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <input value={editingDeliveryData.phone} onChange={(e) => setEditingDeliveryData({ ...editingDeliveryData, phone: e.target.value })} />
                      ) : man.phone}
                    </td>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <input value={editingDeliveryData.email} onChange={(e) => setEditingDeliveryData({ ...editingDeliveryData, email: e.target.value })} />
                      ) : man.email}
                    </td>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <select value={editingDeliveryData.status} onChange={(e) => setEditingDeliveryData({ ...editingDeliveryData, status: e.target.value })}>
                          <option value="available">AVAILABLE</option>
                          <option value="busy">BUSY</option>
                        </select>
                      ) : man.status.toUpperCase()}
                    </td>
                    <td>
                      {editingDeliveryId === man._id ? (
                        <div className="action-group">
                          <button className="table-action save" onClick={() => saveDelivery(man._id)}>Save</button>
                          <button className="table-action" onClick={() => setEditingDeliveryId("")}>Cancel</button>
                        </div>
                      ) : (
                        <div className="action-group">
                          <button className="table-action" onClick={() => startEditDelivery(man)}>Edit</button>
                          <button className="table-action danger" onClick={() => deleteDelivery(man._id)}>Delete</button>
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
    </div>
  );
};

export default AdminDashboard;
