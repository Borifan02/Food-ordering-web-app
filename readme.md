# Food Ordering App

A full-stack web application for ordering food, designed to streamline the process for Customers, Administrators, and Delivery Personnel.

## 🚀 Features

### 👤 User (Customer)
*   **Authentication**: Secure Sign Up and Login.
*   **Browse Menu**: View available food items and filter by categories.
*   **Cart Management**: Add items to the shopping cart and review them before checkout.
*   **Order Placement**: Place orders seamlessly.
*   **Order Tracking**: Track order status in real-time (Pending -> Preparing -> On the Way -> Delivered).
*   **Reviews**: Leave reviews for food items.

### 🛠 Admin
*   **Dashboard**: Comprehensive overview of the system status.
*   **Menu Management**: Add, edit, and delete menu items.
*   **Category Management**: Organize food items into categories.
*   **Order Management**: View all orders and their statuses.
*   **Reports**: Generate and export sales reports as PDF files.
*   **Delivery Management**: Create and manage delivery personnel accounts.

### 🚚 Deliveryman
*   **Dashboard**: Dedicated interface for delivery tasks.
*   **Order Assignment**: View orders ready for delivery ("Preparing").
*   **Status Updates**: Accept orders (changing status to "On the Way") and mark them as "Delivered" upon completion.

## 💻 Tech Stack

### Frontend
*   **React**: UI library for building interactive interfaces.
*   **Vite**: Fast build tool and development server.
*   **React Router DOM**: For client-side routing.
*   **Axios**: For making HTTP requests to the backend.
*   **CSS**: Custom styling for a unique look and feel.

### Backend
*   **Node.js & Express**: Robust runtime and framework for the API.
*   **MongoDB & Mongoose**: NoSQL database and ODM for data modeling.
*   **JWT (JSON Web Tokens)**: Secure authentication and authorization.
*   **Bcryptjs**: Password hashing for security.
*   **Multer**: Handling file uploads (e.g., food images).
*   **PDFKit**: Generating PDF reports for admins.

## ⚙️ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd Web_Programming_Project
    ```

2.  **Install Dependencies**
    Run the following command from the root directory to install dependencies for both frontend and backend:
    ```bash
    npm run install-all
    ```

3.  **Environment Configuration**
    Create a `.env` file in the `backend` directory with the following variables:
    ```env
    PORT=5000
    Mongo_URL=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    ```

4.  **Run the Application**
    Start both the frontend and backend servers concurrently:
    ```bash
    npm run dev
    ```

    *   **Frontend**: http://localhost:5173 (typically)
    *   **Backend**: http://localhost:5000

## 🚀 Deployment

This project is designed to be deployed with the frontend on Vercel and the backend on Render.

### Frontend on Vercel

1. Create a new Vercel project and import this repository.
2. Set the project root directory to `frontend`.
3. Use these build settings:
    - Build command: `npm run build`
    - Output directory: `dist`
4. Add this environment variable in Vercel:
    - `VITE_API_URL` = your Render backend URL, for example `https://your-backend.onrender.com/api`
5. Deploy the project.

### Backend on Render

1. Create a new Render Web Service and connect the same repository.
2. Set the root directory to `backend`.
3. Use these settings:
    - Build command: `npm install`
    - Start command: `npm start`
4. Add these environment variables in Render:
    - `NODE_ENV=production`
    - Do not hardcode `PORT`; Render provides it automatically at runtime
    - `MONGO_URL` = your MongoDB Atlas connection string
    - `JWT_SECRET` = your JWT secret
    - `JWT_EXPIRE` = `30d`
    - `STRIPE_PUBLISHABLE_KEY` = your Stripe publishable key
    - `STRIPE_SECRET_KEY` = your Stripe secret key
    - `CLIENT_URL` = your Vercel frontend URL, for example `https://your-project.vercel.app`
5. Deploy the backend.

### Important Notes

- Do not keep `CLIENT_URL` pointed at localhost in production.
- The frontend must use the Render backend URL through `VITE_API_URL`; it should not call `/api` in production unless Vercel is also proxying that route.
- The backend already accepts both the deployed frontend URL and local development origin through CORS.

## 📂 Project Structure

```
├── backend/                # Node.js/Express Backend
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth & other middleware
│   ├── tests/              # Unit tests
│   └── ...
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── pages/          # Application views (Admin, Delivery, etc.)
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # State management
│   │   └── ...
└── package.json            # Root configuration & scripts
```

## 🧪 Testing

The backend includes comprehensive unit tests for all controllers using **Jest** and **Supertest**.

### Running Tests

```bash
cd backend
npm test
```

### Test Coverage

- **39 passing tests** across 6 test suites
- **Controllers tested**:
  - `auth.controller.js` - Authentication (register, login, getProfile)
  - `delivery.controller.js` - Delivery management
  - `menu.controller.js` - Menu item operations
  - `order.controller.js` - Order processing
  - `review.controller.js` - Review management
  - `report.controller.js` - Dashboard statistics and PDF generation

### Test Features

- ✅ ES Module support with `jest.unstable_mockModule`
- ✅ Mocked database models for isolated testing
- ✅ Success and error case coverage
- ✅ Edge case validation

