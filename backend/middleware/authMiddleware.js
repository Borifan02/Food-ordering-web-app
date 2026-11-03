import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const secret = process.env.JWT_SECRET || "foodie_default_jwt_secret_key_2026";
        const decoded = jwt.verify(token, secret); // Verify token if valid it returns payload
        req.user = decoded; 
        next();
    } catch (error) {
        res.status(400).json({ message: "Invalid token." });
    }
};

export const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        const role = (req.user?.role || "").trim().toLowerCase();
        if (role === "admin" || role === "chief") {
            next();
        } else {
            res.status(403).json({ message: "Access denied. Admins only." });
        }
    });
};

export const verifyDeliveryMan = (req, res, next) => {
    verifyToken(req, res, () => {
        const role = (req.user?.role || "").trim().toLowerCase();
        if (role === "deliveryman") {
            next();
        } else {
            res.status(403).json({ message: "Access denied. Delivery men only." });
        }
    });
};
