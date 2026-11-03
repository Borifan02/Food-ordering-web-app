import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Foodie<span className="dot">.</span></h3>
          <p>Delicious handcrafted food delivered to your doorstep. Fresh ingredients, amazing flavors, and lightning-fast service.</p>
          <div className="social-links">
            <span role="img" aria-label="Facebook">📘</span>
            <span role="img" aria-label="Instagram">📷</span>
            <span role="img" aria-label="Twitter">🐦</span>
          </div>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/menu">Explore Menu</Link></li>
            <li><Link to="/orders">Order History</Link></li>
            <li><Link to="/cart">My Cart</Link></li>
            <li><Link to="/about">About Us</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact & Support</h4>
          <div className="contact-item">
            <span>📍</span>
            <p>123 Food Street, Downtown, FC 12345</p>
          </div>
          <div className="contact-item">
            <span>📞</span>
            <p>+1 (555) 019-2834</p>
          </div>
          <div className="contact-item">
            <span>✉️</span>
            <p>support@foodieapp.com</p>
          </div>
        </div>

        <div className="footer-section">
          <h4>Opening Hours</h4>
          <div className="hours">
            <p><strong>Mon - Fri:</strong> 9:00 AM - 11:00 PM</p>
            <p><strong>Sat - Sun:</strong> 10:00 AM - 12:00 AM</p>
          </div>
          <div className="delivery-info">
            <p>🚚 Free delivery on all orders over $25</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Foodie App. All rights reserved. • Production Ready</p>
      </div>
    </footer>
  );
};

export default Footer;
