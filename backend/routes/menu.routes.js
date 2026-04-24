import express from "express";
import {
	createMenuItem,
	getMenuItems,
	getAllMenuItems,
	updateMenuItem,
	deleteMenuItem,
} from "../controllers/menu.controller.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// GET /api/menu - Public (Anyone can see the menu)
router.get("/", getMenuItems);

// GET /api/menu/all - Admin can see all menu items (including unavailable)
router.get("/all", verifyAdmin, getAllMenuItems);

// POST /api/menu - Admin Only (Create new food item with image)

router.post("/", verifyAdmin, upload.single("image"), createMenuItem);

// PUT /api/menu/:id - Admin only update menu item
router.put("/:id", verifyAdmin, upload.single("image"), updateMenuItem);

// DELETE /api/menu/:id - Admin only delete menu item
router.delete("/:id", verifyAdmin, deleteMenuItem);

export default router;