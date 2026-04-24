import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Recreate __filename and __dirname in ES Modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables with an absolute path to backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import dbConnection from "./models/db.connection.js";

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

const app = express();
const server = createServer(app);
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173"].filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database
dbConnection();

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-order', (orderId) => {
    socket.join(`order-${orderId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

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

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;

