import express from "express";
import { getDashboardStats } from "../controllers/analytics.controller.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", verifyAdmin, getDashboardStats);

export default router;