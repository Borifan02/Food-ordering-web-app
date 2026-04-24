import express from "express";
import { getDashboardStats, exportDashboardStatsPDF } from "../controllers/report.controller.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /dashboard - admin sales report stats
router.get("/dashboard", verifyAdmin, getDashboardStats);

// GET /export-pdf - download pdf report
router.get("/export-pdf", verifyAdmin, exportDashboardStatsPDF);

export default router;
