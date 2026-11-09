import { OrderModel } from "../models/order.model.js";
import PDFDocument from "pdfkit";
import logger from "../utils/logger.js";

export const getDashboardStats = async (req, res) => {
    try {
        // 1. Total Revenue & Count
        // aggregates all orders into one document
        const totalStats = await OrderModel.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } }
        ]);

        // 2. Revenue by Day (Last 7 days)
        const dailyStats = await OrderModel.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    dailyRevenue: { $sum: "$totalAmount" }, // total revenue per day
                    orderCount: { $sum: 1 } // number of orders per day
                }
            },
            { $sort: { _id: 1 } }, // Sorts by date ascending
            { $limit: 7 }
        ]);

        // 3. Pending Orders Count
        const pendingCount = await OrderModel.countDocuments({ status: "pending" });

        res.status(200).json({
            totalRevenue: totalStats[0]?.totalRevenue || 0,
            totalOrders: totalStats[0]?.totalOrders || 0,
            pendingOrders: pendingCount,
            dailyStats,
            topSellingItems: await OrderModel.aggregate([
                { $unwind: "$items" }, // breaks down each order’s items array into individual documents.
                { $group: { _id: "$items.name", totalSold: { $sum: "$items.quantity" } } },
                { $sort: { totalSold: -1 } },
                { $limit: 5 }
            ])
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const exportDashboardStatsPDF = async (req, res) => {
    try {
        // Fetch Stats
        const totalStats = await OrderModel.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalOrders: { $sum: 1 } } }
        ]);

        const pendingCount = await OrderModel.countDocuments({ status: "pending" });

        const topSellingItems = await OrderModel.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.name", totalSold: { $sum: "$items.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        const dailyStats = await OrderModel.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    dailyRevenue: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 7 }
        ]);

        // Generate PDF
        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=dashboard_report.pdf');

        doc.pipe(res);

        // Header
        doc.fontSize(25).text('Admin Dashboard Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary Stats
        doc.fontSize(18).text('Summary Statistics', { underline: true });
        doc.moveDown();
        doc.fontSize(14).text(`Total Revenue: ${(totalStats[0]?.totalRevenue || 0).toFixed(2)} ETB`);
        doc.text(`Total Orders: ${totalStats[0]?.totalOrders || 0}`);
        doc.text(`Pending Orders: ${pendingCount}`);
        doc.moveDown(2);

        // Top Selling Items
        doc.fontSize(18).text('Top Selling Items', { underline: true });
        doc.moveDown();
        topSellingItems.forEach((item, index) => {
            doc.fontSize(14).text(`${index + 1}. ${item._id} - ${item.totalSold} sold`);
        });
        doc.moveDown(2);

        // Daily Stats
        doc.fontSize(18).text('Last 7 Days Performance', { underline: true });
        doc.moveDown();

        // Simple Table Header
        const tableTop = doc.y;
        const dateX = 50;
        const revenueX = 200;
        const ordersX = 350;

        doc.fontSize(12).text('Date', dateX, tableTop, { bold: true });
        doc.text('Revenue', revenueX, tableTop, { bold: true });
        doc.text('Orders', ordersX, tableTop, { bold: true });

        doc.moveDown();
        let y = doc.y;

        dailyStats.forEach(stat => {
            doc.text(stat._id, dateX, y);
            doc.text(`${stat.dailyRevenue.toFixed(2)} ETB`, revenueX, y);
            doc.text(stat.orderCount.toString(), ordersX, y);
            y += 20;
        });

        doc.end();

    } catch (error) {
        logger.error("PDF Export Error:", error);
        res.status(500).json({ message: "Failed to generate PDF report" });
    }
};

/**
 * GET /api/reports/export-csv
 * Export orders and financial records as CSV for accounting/audit
 */
export const exportOrdersCSV = async (req, res) => {
    try {
        const orders = await OrderModel.find()
            .populate("userId", "firstName lastName phone email")
            .populate("deliveryManId", "name phone")
            .sort({ createdAt: -1 });

        const headers = [
            "Order ID",
            "Date",
            "Customer Name",
            "Customer Phone",
            "Delivery Address",
            "Courier",
            "Payment Method",
            "Payment Provider",
            "Transaction Ref",
            "Payment Status",
            "Subtotal (ETB)",
            "15% VAT (ETB)",
            "Delivery Fee (ETB)",
            "Gursha/Tip (ETB)",
            "Total Amount (ETB)",
            "Order Status",
        ];

        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const rows = orders.map((o) => {
            const customerName = o.userId ? `${o.userId.firstName || ""} ${o.userId.lastName || ""}`.trim() : "Guest/Deleted";
            const phone = o.userId?.phone || o.payment?.senderPhone || "";
            const courier = o.deliveryManId?.name || "Unassigned";
            const subtotal = Number(o.subtotal || o.totalAmount || 0);
            const vat = Math.round(subtotal * 0.15 * 100) / 100;
            const deliveryFee = Number(o.deliveryFee || 0);
            const tip = Number(o.tipAmount || 0);
            const total = Number(o.totalAmount || 0);

            return [
                escapeCSV(o._id?.toString() || ""),
                escapeCSV(new Date(o.createdAt).toISOString().split("T")[0]),
                escapeCSV(customerName),
                escapeCSV(phone),
                escapeCSV(o.deliveryAddress || ""),
                escapeCSV(courier),
                escapeCSV(o.payment?.method || "Cash"),
                escapeCSV(o.payment?.provider || ""),
                escapeCSV(o.payment?.transactionId || ""),
                escapeCSV(o.payment?.status || "Pending"),
                escapeCSV(subtotal.toFixed(2)),
                escapeCSV(vat.toFixed(2)),
                escapeCSV(deliveryFee.toFixed(2)),
                escapeCSV(tip.toFixed(2)),
                escapeCSV(total.toFixed(2)),
                escapeCSV(o.status || "pending"),
            ].join(",");
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n"); // UTF-8 BOM for Excel

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Foodie_Orders_Report_${new Date().toISOString().split("T")[0]}.csv"`
        );

        res.status(200).send(csvContent);
    } catch (error) {
        logger.error("CSV Export Error:", error);
        res.status(500).json({ message: "Failed to generate CSV export", error: error.message });
    }
};

