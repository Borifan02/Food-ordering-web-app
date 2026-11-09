import express from "express";
import { 
    getDashboardStats, 
    exportDashboardStatsPDF, 
    exportOrdersCSV 
} from "../controllers/report.controller.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /dashboard - admin sales report stats
router.get("/dashboard", verifyAdmin, getDashboardStats);

// GET /export-pdf - download pdf report
router.get("/export-pdf", verifyAdmin, exportDashboardStatsPDF);

// GET /export-csv - download excel/csv orders report
router.get("/export-csv", verifyAdmin, exportOrdersCSV);

export default router;
