import mongoose from "mongoose";
import logger from "../utils/logger.js";

const dbConnection = async () => {
    if (process.env.NODE_ENV === "test") {
        return;
    }

    try {
        const mongoUri =
            process.env.Mongo_URL ||
            process.env.MONGO_URL ||
            process.env.MONGODB_URI;

        if (!mongoUri) {
            logger.warn(
                "Missing MongoDB connection string. Set MONGO_URL in backend/.env for database persistence."
            );
            return;
        }

        await mongoose.connect(mongoUri);
        logger.info("Connected to MongoDB successfully");

        // Automatically ensure demo accounts exist for hassle-free 1-click evaluation
        try {
            const { ensureDemoAccounts } = await import("../utils/ensureDemo.js");
            await ensureDemoAccounts();
        } catch (seedErr) {
            logger.warn(`Demo accounts initialization check skipped: ${seedErr.message}`);
        }
    } catch (error) {
        logger.error("MongoDB Connection Error:", error);
    }
};

export default dbConnection;
