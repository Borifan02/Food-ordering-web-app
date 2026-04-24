import { OrderModel } from "../models/order.model.js";
import { ItemModel } from "../models/menuItem.model.js";
import { userModel } from "../models/user.model.js";
import logger from "../utils/logger.js";

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - 7));
    const startOfMonth = new Date(today.setMonth(today.getMonth() - 1));

    // Basic stats
    const [
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      totalCustomers,
      totalMenuItems
    ] = await Promise.all([
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ createdAt: { $gte: startOfDay } }),
      OrderModel.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      OrderModel.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),
      userModel.countDocuments({ role: { $ne: "admin" } }),
      ItemModel.countDocuments({ isAvailable: true })
    ]);

    // Order trends (last 7 days)
    const orderTrends = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: startOfWeek } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Popular items
    const popularItems = await OrderModel.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalOrdered: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 5 }
    ]);

    // Order status distribution
    const statusDistribution = await OrderModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      basicStats: {
        totalOrders,
        todayOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        totalCustomers,
        totalMenuItems
      },
      orderTrends,
      popularItems,
      statusDistribution
    });
  } catch (error) {
    logger.error("Analytics error:", error);
    res.status(500).json({ message: error.message });
  }
};