import { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/axios";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import "./Menu.css";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500";

const DIETARY_FILTERS = [
  { id: "all", label: "All Items", icon: "🍽️" },
  { id: "popular", label: "Popular", icon: "🔥" },
  { id: "veg", label: "Vegetarian", icon: "🌱" },
  { id: "spicy", label: "Spicy", icon: "🌶️" },
  { id: "special", label: "Chef's Special", icon: "⭐" },
  { id: "under12", label: "Under $12", icon: "🏷️" },
];

const Menu = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeDietary, setActiveDietary] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("foodie_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Food Item Quick View Modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [itemReviews, setItemReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const { addToCart, updateQuantity, getItemQuantity, totalItemCount, finalTotal } =
    useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Compute base asset URL without hardcoding localhost:5000
  const assetBase = useMemo(() => {
    const configured = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    return configured.endsWith("/api") ? configured.slice(0, -4) : configured;
  }, []);

  const resolveImageUrl = (img) => {
    if (!img) return FALLBACK_IMAGE;
    if (img.startsWith("http")) return img;
    return `${assetBase}${img}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [menuRes, catRes] = await Promise.all([
          apiClient.get("/menu"),
          apiClient.get("/categories"),
        ]);
        setItems(menuRes.data || []);
        setCategories(catRes.data || []);
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Could not load menu items. Please check backend connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync favorites
  const toggleFavorite = (itemId, e) => {
    e?.stopPropagation?.();
    setFavorites((prev) => {
      let updated;
      if (prev.includes(itemId)) {
        updated = prev.filter((id) => id !== itemId);
        toast.info("Removed from saved dishes");
      } else {
        updated = [...prev, itemId];
        toast.success("Saved to your favorites! ❤️");
      }
      localStorage.setItem("foodie_favorites", JSON.stringify(updated));
      return updated;
    });
  };

  // Open food quick view modal & fetch reviews
  const handleOpenItemModal = async (item) => {
    setSelectedItem(item);
    setModalQuantity(1);
    setItemReviews([]);
    try {
      setLoadingReviews(true);
      const res = await apiClient.get(`/reviews/${item._id}`);
      setItemReviews(res.data || []);
    } catch {
      setItemReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Category filter
    if (activeCategory !== "All") {
      result = result.filter((item) => {
        const catName = item.categoryId?.name || item.category;
        return catName?.toLowerCase() === activeCategory.toLowerCase();
      });
    }

    // Dietary & Tag filter
    if (activeDietary !== "all") {
      if (activeDietary === "popular") {
        result = result.filter(
          (i) => i.isFeatured || (i.tags && i.tags.includes("Popular"))
        );
      } else if (activeDietary === "veg") {
        result = result.filter(
          (i) => i.tags && i.tags.some((t) => t.toLowerCase().includes("veg"))
        );
      } else if (activeDietary === "spicy") {
        result = result.filter(
          (i) => i.tags && i.tags.some((t) => t.toLowerCase().includes("spicy"))
        );
      } else if (activeDietary === "special") {
        result = result.filter(
          (i) => i.isFeatured || (i.tags && i.tags.includes("ChefSpecial"))
        );
      } else if (activeDietary === "under12") {
        result = result.filter((i) => Number(i.price) < 12);
      }
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === "price-low") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "rating") {
      result.sort(
        (a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0)
      );
    } else if (sortBy === "alpha") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [items, activeCategory, activeDietary, searchTerm, sortBy]);

  const handleAddToCart = (item, e) => {
    e?.stopPropagation?.();
    addToCart(item, 1);
    toast.success(`Added ${item.name} to cart! 🛒`);
  };

  if (loading) {
    return (
      <div className="menu-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Preparing menu masterpieces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-container">
      {/* Modern Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">⚡ Fresh & Hot Delivery in 30-45 Mins</div>
          <h1>
            Crave it? We Deliver it,{" "}
            <span className="hero-highlight">
              {user?.firstName || user?.name || "Foodie"}!
            </span>{" "}
            🍕
          </h1>
          <p>Hand-crafted pizzas, smash burgers, bowls, sushi and delectable desserts</p>

          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search dishes, ingredients, or cravings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="promo-ribbon">
        <span>🎉 Special Offer: Use code <strong>WELCOME10</strong> for 10% off or <strong>FREESHIP</strong> for free delivery!</span>
      </div>

      {/* Categories Horizontal Carousel */}
      <div className="category-section-header">
        <h2>Explore Categories</h2>
        <span className="category-count">{categories.length} categories</span>
      </div>

      <div className="category-scroll-container">
        <button
          className={`category-pill ${activeCategory === "All" ? "active" : ""}`}
          onClick={() => setActiveCategory("All")}
        >
          <span className="cat-icon">🍽️</span>
          <span>All Menu</span>
          <span className="cat-pill-count">{items.length}</span>
        </button>

        {categories.map((cat) => {
          const count = items.filter(
            (i) => i.categoryId?._id === cat._id || i.categoryId?.name === cat.name
          ).length;
          return (
            <button
              key={cat._id}
              className={`category-pill ${activeCategory === cat.name ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.name)}
            >
              <img
                src={cat.image || FALLBACK_IMAGE}
                alt={cat.name}
                className="cat-thumb"
                onError={(e) => (e.target.src = FALLBACK_IMAGE)}
              />
              <span>{cat.name}</span>
              {count > 0 && <span className="cat-pill-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Secondary Dietary Filters & Sorting Controls */}
      <div className="filter-sort-bar">
        <div className="dietary-pills-list">
          {DIETARY_FILTERS.map((d) => (
            <button
              key={d.id}
              className={`diet-pill ${activeDietary === d.id ? "active" : ""}`}
              onClick={() => setActiveDietary(d.id)}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>

        <div className="sort-selector">
          <label htmlFor="sort-dropdown">Sort by:</label>
          <select
            id="sort-dropdown"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="alpha">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Result Count Status */}
      <div className="results-count-row">
        <span>Showing <strong>{filteredItems.length}</strong> delicious items</span>
        {(searchTerm || activeCategory !== "All" || activeDietary !== "all") && (
          <button
            className="reset-filters-btn"
            onClick={() => {
              setSearchTerm("");
              setActiveCategory("All");
              setActiveDietary("all");
            }}
          >
            Reset Filters ↺
          </button>
        )}
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍽️</div>
          <h3>No matching dishes found</h3>
          <p>Try adjusting your search keywords, category, or dietary filters</p>
          <button
            className="clear-filters-btn"
            onClick={() => {
              setSearchTerm("");
              setActiveCategory("All");
              setActiveDietary("all");
            }}
          >
            View All Dishes
          </button>
        </div>
      ) : (
        <div className="menu-grid">
          {filteredItems.map((item) => {
            const inCartQty = getItemQuantity(item._id);
            const isFav = favorites.includes(item._id);

            return (
              <div
                key={item._id}
                className="menu-card"
                onClick={() => handleOpenItemModal(item)}
              >
                <div className="card-image-box">
                  <img
                    src={resolveImageUrl(item.image)}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => (e.target.src = FALLBACK_IMAGE)}
                  />

                  {/* Favorite Heart Button */}
                  <button
                    className={`fav-heart-btn ${isFav ? "active" : ""}`}
                    onClick={(e) => toggleFavorite(item._id, e)}
                    aria-label="Save to favorites"
                    title={isFav ? "Remove favorite" : "Save favorite"}
                  >
                    {isFav ? "❤️" : "🤍"}
                  </button>

                  {/* Badges on card */}
                  <div className="card-badge-container">
                    {item.isFeatured && (
                      <span className="badge-tag chef-badge">⭐ Special</span>
                    )}
                    {item.tags?.includes("Spicy") && (
                      <span className="badge-tag spicy-badge">🌶️ Spicy</span>
                    )}
                    {item.tags?.includes("Vegetarian") && (
                      <span className="badge-tag veg-badge">🌱 Veg</span>
                    )}
                  </div>

                  <span className="card-category-pill">
                    {item.categoryId?.name || "Dish"}
                  </span>
                </div>

                <div className="card-content">
                  <div className="card-top-row">
                    <h3 className="card-title">{item.name}</h3>
                    <div className="rating-pill">
                      ★ {item.averageRating && Number(item.averageRating) > 0 ? item.averageRating : "4.9"}
                      <span className="review-count">
                        ({item.reviewCount || 12})
                      </span>
                    </div>
                  </div>

                  <p className="card-desc">{item.description}</p>

                  <div className="card-meta-row">
                    <span className="prep-time-tag">
                      ⏱️ {item.prepTime || "15-20 min"}
                    </span>
                    <span className="calorie-tag">
                      🔥 {item.calories || 520} kcal
                    </span>
                  </div>

                  <div className="card-footer">
                    <span className="price-tag">
                      ${Number(item.price).toFixed(2)}
                    </span>

                    {/* Inline Card Quantity Controls */}
                    {inCartQty > 0 ? (
                      <div
                        className="inline-cart-stepper"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="stepper-btn"
                          onClick={() => updateQuantity(item._id, -1)}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="stepper-val">{inCartQty}</span>
                        <button
                          className="stepper-btn"
                          onClick={() => updateQuantity(item._id, 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        className="card-add-btn"
                        onClick={(e) => handleAddToCart(item, e)}
                      >
                        Add +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && (
        <div className="floating-cart-bar">
          <div className="floating-cart-info">
            <span className="floating-cart-count">
              🛒 {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"}
            </span>
            <span className="floating-cart-total">
              ${finalTotal.toFixed(2)}
            </span>
          </div>
          <button
            className="floating-checkout-btn"
            onClick={() => navigate("/cart")}
          >
            View Cart & Checkout →
          </button>
        </div>
      )}

      {/* Food Item Quick View Modal */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div
            className="item-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-icon"
              onClick={() => setSelectedItem(null)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="item-detail-grid">
              <div className="modal-image-col">
                <img
                  src={resolveImageUrl(selectedItem.image)}
                  alt={selectedItem.name}
                  onError={(e) => (e.target.src = FALLBACK_IMAGE)}
                />
              </div>

              <div className="modal-info-col">
                <div className="modal-header-meta">
                  <span className="modal-category">
                    {selectedItem.categoryId?.name || "Dish"}
                  </span>
                  <div className="rating-pill">
                    ★ {selectedItem.averageRating || "4.9"} ({selectedItem.reviewCount || 12} reviews)
                  </div>
                </div>

                <h2>{selectedItem.name}</h2>
                <div className="modal-price">
                  ${Number(selectedItem.price).toFixed(2)}
                </div>

                <p className="modal-desc">{selectedItem.description}</p>

                <div className="modal-highlights">
                  <div className="highlight-item">
                    <span className="highlight-label">Prep Time</span>
                    <span className="highlight-value">
                      ⏱️ {selectedItem.prepTime || "15-20 min"}
                    </span>
                  </div>
                  <div className="highlight-item">
                    <span className="highlight-label">Calories</span>
                    <span className="highlight-value">
                      🔥 {selectedItem.calories || 520} kcal
                    </span>
                  </div>
                  <div className="highlight-item">
                    <span className="highlight-label">Dietary</span>
                    <span className="highlight-value">
                      {selectedItem.tags?.join(", ") || "Fresh & Crafted"}
                    </span>
                  </div>
                </div>

                {/* Reviews Section inside modal */}
                <div className="modal-reviews-section">
                  <h4>Customer Reviews ({itemReviews.length})</h4>
                  {loadingReviews ? (
                    <p className="loading-reviews-text">Loading reviews...</p>
                  ) : itemReviews.length === 0 ? (
                    <p className="no-reviews-text">
                      No customer reviews yet. Be the first to try and rate it!
                    </p>
                  ) : (
                    <div className="reviews-scroll-list">
                      {itemReviews.slice(0, 3).map((r, idx) => (
                        <div key={idx} className="review-card-mini">
                          <div className="review-mini-header">
                            <span className="review-author">
                              {r.userId?.firstName || "Verified Customer"}
                            </span>
                            <span className="review-stars">
                              {"★".repeat(r.rating || 5)}
                            </span>
                          </div>
                          <p className="review-text">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Add to Cart Controls */}
                <div className="modal-actions-bar">
                  <div className="modal-stepper">
                    <button
                      onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    >
                      -
                    </button>
                    <span>{modalQuantity}</span>
                    <button onClick={() => setModalQuantity(modalQuantity + 1)}>
                      +
                    </button>
                  </div>

                  <button
                    className="modal-add-btn"
                    onClick={() => {
                      addToCart(selectedItem, modalQuantity);
                      toast.success(
                        `Added ${modalQuantity}x ${selectedItem.name} to cart!`
                      );
                      setSelectedItem(null);
                    }}
                  >
                    Add {modalQuantity} to Order • $
                    {(Number(selectedItem.price) * modalQuantity).toFixed(2)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
