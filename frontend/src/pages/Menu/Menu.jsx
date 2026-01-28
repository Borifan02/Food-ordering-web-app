import { useEffect, useState, useContext } from "react";
import apiClient from "../../api/axios";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import "./Menu.css";

const Menu = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching menu data...');
        const [menuRes, catRes] = await Promise.all([
          apiClient.get("/menu"),
          apiClient.get("/categories"),
        ]);
        console.log('Menu response:', menuRes.data);
        console.log('Categories response:', catRes.data);
        setItems(menuRes.data);
        setFilteredItems(menuRes.data);
        setCategories(catRes.data);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filterItems = (categoryName) => {
    setActiveCategory(categoryName);
    let filtered = items;
    
    if (categoryName !== "All") {
      filtered = items.filter(
        (item) => item.categoryId.name === categoryName
      );
    }
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredItems(filtered);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    let filtered = items;
    
    if (activeCategory !== "All") {
      filtered = items.filter(
        (item) => item.categoryId.name === activeCategory
      );
    }
    
    if (term) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term.toLowerCase()) ||
        item.description.toLowerCase().includes(term.toLowerCase())
      );
    }
    
    setFilteredItems(filtered);
  };

  if (loading) {
    return (
      <div className="menu-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading delicious food...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome back, {user?.name || 'Food Lover'}! 🍽️</h1>
          <p>Discover amazing dishes and satisfy your cravings</p>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for dishes..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            <button className="search-btn">🔍</button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-card">
          <span className="stat-number">{items.length}</span>
          <span className="stat-label">Menu Items</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{categories.length}</span>
          <span className="stat-label">Categories</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{filteredItems.length}</span>
          <span className="stat-label">Available Now</span>
        </div>
      </div>

      <h2 className="section-title">Our Menu</h2>
      
      {/* Category Filter Bar */}
      <div className="category-filter">
        <button
          className={activeCategory === "All" ? "active" : ""}
          onClick={() => filterItems("All")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            className={activeCategory === cat.name ? "active" : ""}
            onClick={() => filterItems(cat.name)}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <h3>No items found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="menu-grid">
          {filteredItems.map((item) => (
            <div key={item._id} className="menu-card">
              <div className="card-image">
                <img
                  src={
                    item.image?.startsWith('http') 
                      ? item.image
                      : item.image
                      ? `http://localhost:5000${item.image}`
                      : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300"
                  }
                  alt={item.name}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300";
                  }}
                />
                <div className="card-overlay">
                  <span className="category-tag">{item.categoryId?.name}</span>
                </div>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h3>{item.name}</h3>
                  <div className="rating-display">
                    ★ {item.averageRating || 0} ({item.reviewCount || 0})
                  </div>
                </div>
                <p className="description">{item.description}</p>
                <div className="card-footer">
                  <span className="price">${item.price}</span>
                  <button 
                    className="add-btn" 
                    onClick={() => addToCart(item)}
                    title="Add to cart"
                  >
                    Add to Cart +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;
