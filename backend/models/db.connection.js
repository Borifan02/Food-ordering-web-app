import mongoose from "mongoose";
import logger from "../utils/logger.js";
const dbConnection = async () => {
    try {
        const mongoUri =
            process.env.Mongo_URL ||
            process.env.MONGO_URL ||
            process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error(
                "Missing MongoDB connection string. Set Mongo_URL, MONGO_URL, or MONGODB_URI in backend/.env."
            );
        }

        await mongoose.connect(mongoUri);
        logger.info("Connected to MongoDB");
    } catch (error) {
        logger.error("MongoDB Connection Error:", error);
        process.exit(1);
    }
};
export default dbConnection;
