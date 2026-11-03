import bcrypt from "bcryptjs";
import { userModel } from "../models/user.model.js";
import { DeliveryManModel } from "../models/deliveryMan.model.js";
import logger from "./logger.js";

export const ensureDemoAccounts = async () => {
  try {
    const adminExists = await userModel.findOne({ email: "admin@foodie.com" });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash("admin123", salt);
      await userModel.create({
        firstName: "Admin",
        lastName: "Manager",
        email: "admin@foodie.com",
        password: adminPassword,
        role: "admin",
        phone: "01234567890",
        address: "HQ Foodie Central, 100 Chef Way",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
      });
      logger.info("Auto-provisioned Admin demo account (admin@foodie.com / admin123)");
    }

    const customerExists = await userModel.findOne({ email: "user@foodie.com" });
    if (!customerExists) {
      const salt = await bcrypt.genSalt(10);
      const userPassword = await bcrypt.hash("user123", salt);
      await userModel.create({
        firstName: "Sarah",
        lastName: "Jenkins",
        email: "user@foodie.com",
        password: userPassword,
        role: "user",
        phone: "01987654321",
        address: "742 Evergreen Terrace, Apt 4B",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
      });
      logger.info("Auto-provisioned Customer demo account (user@foodie.com / user123)");
    }

    const deliveryExists = await DeliveryManModel.findOne({ email: "delivery@foodie.com" });
    if (!deliveryExists) {
      const salt = await bcrypt.genSalt(10);
      const deliveryPassword = await bcrypt.hash("delivery123", salt);
      await DeliveryManModel.create({
        name: "Alex Martinez",
        phone: "01122334455",
        email: "delivery@foodie.com",
        password: deliveryPassword,
        role: "deliveryMan",
        status: "available",
        vehicleType: "Scooter",
        rating: 4.95,
        totalDeliveries: 42
      });
      logger.info("Auto-provisioned Delivery Driver demo account (delivery@foodie.com / delivery123)");
    }
  } catch (err) {
    logger.warn(`Demo accounts initialization check skipped: ${err.message}`);
  }
};

