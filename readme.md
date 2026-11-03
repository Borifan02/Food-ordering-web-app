# Foodie — Production-Ready Full-Stack Food Ordering Platform 🍽️

A full-stack, real-time web application for food ordering, designed for **Customers**, **Administrators**, and **Delivery Personnel**. Built with React 19, Node.js, Express, MongoDB, Socket.IO, and Stripe.

---

## ⚡ Quick Demo Accounts (1-Click Login)

The application features built-in 1-click demo login buttons directly on the Navbar & Login page:

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@foodie.com` | `admin123` | KPI analytics, order management, menu CRUD, category CRUD, fleet dispatch, PDF report |
| **🍔 Customer** | `user@foodie.com` | `user123` | Browse menu, cart, promo coupons, live order tracking map, reviews, reorder, receipts |
| **🚚 Delivery Driver** | `delivery@foodie.com` | `delivery123` | Online/break status, accept orders, customer call shortcut, complete deliveries, earnings |

---

## 🚀 Key Features

### 👤 Customer (User)
* **Interactive Menu**: Live instant search with debounce, category carousel with count badges, dietary filter pills (🌱 Vegetarian, 🔥 Spicy, ⭐ Chef's Special, 🏷️ Under $12), and sorting (Price, Rating, Alphabetical).
* **Card Quantity Stepper**: Adjust quantities `[-] qty [+]` directly on food cards without opening the cart.
* **Wishlist / Favorites**: 1-click heart button to save favorite dishes.
* **Dish Quick View Modal**: High-res photo, nutrition facts (calories, prep time), customer reviews with star ratings, and quantity selector.
* **Cart & Checkout**:
  * **Free Delivery Progress**: Interactive progress bar indicating amount remaining to unlock free delivery ($25 threshold).
  * **Promo Coupons**: Built-in support for promo codes (`WELCOME10` for 10% off, `TASTY20` for 20% off, `FREESHIP` for free delivery).
  * **Payment Choice**: Choose between **Cash on Delivery (COD)** (1-click instant placement) and **Card (Stripe)**.
  * **Delivery & Cooking Instructions**: Add special requests like "Extra napkins" or "Ring doorbell".
  * **Celebratory Confetti**: High-performance canvas confetti burst upon order completion.
* **Real-Time Live Order Tracking**:
  * **Simulated Interactive Delivery Route Map**: Animated canvas showing restaurant, moving scooter icon along the route, and customer destination pin with pulsating ripple effect.
  * **Live Status Stepper**: Order Placed ➔ Kitchen Preparing ➔ Out for Delivery ➔ Delivered (via WebSockets with polling fallback).
  * **Estimated Delivery Timer**: Live countdown estimate.
  * **Assigned Driver Card**: Driver photo, vehicle type, star rating, and direct phone link.
  * **Order Cancellation**: Customer can cancel their order with reason while status is "pending".
  * **Post-Delivery Reviews**: Rate food with 1-5 stars, select tag pills ("Hot & Fresh", "Super Fast", "Delicious"), and write reviews.
* **Order History & Receipts**:
  * Filter orders by status (All, Active, Completed, Cancelled).
  * **1-Click Reorder**: Instantly loads past order items into cart.
  * **Printable Invoice Receipt Modal**: Formatted restaurant receipt with print button.

### 🛠️ Administrator
* **Live KPI Dashboard**: Total revenue, total orders, pending orders requiring kitchen attention, and active fleet size with trend indicators.
* **Order Management**:
  * Filter orders by status (All, Pending, Preparing, On The Way, Delivered, Cancelled).
  * Progression dropdown with real-time Socket.IO broadcasts to customer and delivery partner screens.
  * **Driver Assignment Modal**: Dispatch to a specific delivery partner or use system auto-assignment.
* **Menu Management**:
  * In-line instant availability toggle (`isAvailable`) directly on table rows.
  * Add dish modal with image upload, prep time, calories, and categories.
  * Inline editing and delete confirmations.
* **Category Management**: Create, edit, toggle active status, and upload category thumbnails.
* **Fleet Management**: View drivers, vehicle types, ratings, and add new delivery accounts.
* **Sales Reports & PDF Export**: Instant official PDF report generation via PDFKit.

### 🚚 Delivery Driver
* **Driver Availability Toggle**: Switch between "🟢 Available for Orders" and "☕ On Break / Offline".
* **Driver Metrics Bar**: Daily completed deliveries, earned delivery fees, vehicle type, and driver rating.
* **Orders Ready for Pickup**: Real-time list of orders prepared by the kitchen with customer drop-off address and item breakdown.
* **Active Delivery Management**:
  * Customer drop-off address and special delivery notes.
  * 1-click customer phone call shortcut.
  * Action button to confirm successful delivery.
* **Delivery History**: Complete history of past completed deliveries and fees earned.

---

## 💻 Tech Stack

### Frontend
* **React 19** with **Vite 7**
* **React Router DOM 7**
* **Socket.io Client** for real-time live events
* **Stripe React / Stripe.js** for card payments
* **Axios** with JWT request interceptors
* **Custom Toast & Modal Notification System** (Zero browser `alert()` dependency)
* **Custom Canvas Confetti & Route Simulation Engine**

### Backend
* **Node.js & Express 5**
* **Socket.IO** for real-time bidirectional communication
* **MongoDB & Mongoose 9**
* **JWT (JSON Web Tokens)** & **Bcryptjs**
* **Helmet** with Cross-Origin Resource Policy & **Express Rate Limit**
* **Multer** for food image uploads
* **PDFKit** for PDF sales report generation
* **Jest & Supertest** for automated controller tests

---

## ⚙️ Installation & Local Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd Food-ordering-web-app
```

### 2. Install all dependencies
```bash
npm run install-all
```

### 3. Environment Variables

Create `.env` inside `backend/`:
```env
PORT=5000
NODE_ENV=development
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=super_secret_jwt_key_foodie_app_production_2026
JWT_EXPIRE=30d
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_SECRET_KEY=sk_test_placeholder
CLIENT_URL=http://localhost:5173
```

Create `.env` inside `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
```

### 4. Seed the Database
Seed sample categories, rich dishes with high-res photos, coupons, and demo accounts:
```bash
npm run seed
```

### 5. Run Development Servers
```bash
npm run dev
```
* **Frontend**: `http://localhost:5173`
* **Backend**: `http://localhost:5000`

---

## 🧪 Testing

The backend includes a comprehensive test suite across all controllers:
```bash
npm test
```
* **39 passing unit tests** across 6 test suites
* Tested controllers:
  * `auth.controller.js` — registration, login, profile retrieval
  * `delivery.controller.js` — driver creation, assignment, deliveries
  * `order.controller.js` — order placement, calculations, statuses
  * `menu.controller.js` — item creation, rating aggregations
  * `review.controller.js` — customer reviews & feedback
  * `report.controller.js` — dashboard stats & PDF generation

---

## 🚀 Production Deployment

### Frontend (e.g. Vercel)
* **Root Directory**: `frontend`
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Environment Variables**:
  * `VITE_API_URL` = `https://your-backend.onrender.com/api`
  * `VITE_SOCKET_URL` = `https://your-backend.onrender.com`

### Backend (e.g. Render)
* **Root Directory**: `backend`
* **Build Command**: `npm install`
* **Start Command**: `npm start`
* **Environment Variables**:
  * `NODE_ENV=production`
  * `MONGO_URL` = your MongoDB Atlas connection string
  * `JWT_SECRET` = your secure JWT secret
  * `CLIENT_URL` = `https://your-frontend.vercel.app`
