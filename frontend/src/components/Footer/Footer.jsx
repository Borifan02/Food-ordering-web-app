import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Foodie<span className="dot">.</span></h3>
          <p>Delicious food delivered to your doorstep. Fresh ingredients, amazing flavors, and exceptional service.</p>
          <div className="social-links">
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="Instagram">📷</a>
            <a href="#" aria-label="Twitter">🐦</a>
          </div>
        </div>
        
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/menu">Menu</a></li>
            <li><a href="/orders">Orders</a></li>
            <li><a href="/cart">Cart</a></li>
            <li><a href="/about">About Us</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Contact Info</h4>
          <div className="contact-item">
            <span>📍</span>
            <p>123 Food Street, Addis Ababa City, FC 12345</p>
          </div>
          <div className="contact-item">
            <span>📞</span>
            <p>+251965844287</p>
          </div>
          <div className="contact-item">
            <span>✉️</span>
            <p>dabasaborifan@gmail.com</p>
          </div>
        </div>
        
        <div className="footer-section">
          <h4>Opening Hours</h4>
          <div className="hours">
            <p><strong>Mon - Fri:</strong> 9:00 AM - 11:00 PM</p>
            <p><strong>Sat - Sun:</strong> 10:00 AM - 12:00 AM</p>
          </div>
          <div className="delivery-info">
            <p>🚚 Free delivery on orders over $25</p>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 Foodie. All rights reserved. | Privacy Policy | Terms of Service</p>
      </div>
    </footer>
  );
};

export default Footer;