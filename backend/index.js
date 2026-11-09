import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Recreate __filename and __dirname in ES Modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables with an absolute path to backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

import dbConnection from "./models/db.connection.js";
import logger from "./utils/logger.js";

// Import Routes
import authRoutes from "./routes/auth.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import orderRoutes from "./routes/order.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import reportRoutes from "./routes/report.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

const app = express();
const server = createServer(app);

// Trust first proxy (Render, Vercel, Heroku, Cloudflare) for accurate rate limiting and IP resolution
app.set("trust proxy", 1);

// Dynamic CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      process.env.NODE_ENV !== "production" ||
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev/staging to prevent CORS blocks
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security Middleware with cross-origin asset support
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { message: "Too many authentication attempts, please try again in a few minutes." }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { message: "Too many requests from this IP, please try again later." }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api", apiLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors(corsOptions));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Connection
dbConnection();

// Socket.IO for real-time order tracking & delivery updates
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  // Join a specific order room for live tracking
  socket.on('join-order', (orderId) => {
    if (orderId) {
      socket.join(`order-${orderId}`);
      logger.info(`Socket ${socket.id} joined room order-${orderId}`);
    }
  });

  socket.on('leave-order', (orderId) => {
    if (orderId) {
      socket.leave(`order-${orderId}`);
    }
  });

  // Join user personal notification channel
  socket.on('join-user', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      logger.info(`Socket ${socket.id} joined user channel: user-${userId}`);
    }
  });

  // Join admin notifications channel
  socket.on('join-admin', () => {
    socket.join('admin-channel');
  });

  // Join delivery drivers channel
  socket.on('join-delivery', () => {
    socket.join('delivery-channel');
  });

  // Driver sends real-time coordinates / location ping
  socket.on('driver-location-update', ({ orderId, coords }) => {
    if (orderId) {
      socket.to(`order-${orderId}`).emit('driver-location', { orderId, coords });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible in request handlers
app.set('io', io);

// Health check and root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Food Ordering Production API is running",
    version: "2.0.0",
    docs: "/api/health",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Fallback 404 handler for any other unhandled routes
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        logger.info(`Foodie API Server running on port ${PORT}`);
    });
}

export default app;
