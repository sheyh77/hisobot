import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { rateLimit } from "express-rate-limit";

dotenv.config();

export const signUser = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "TOO_MANY_AUTH_ATTEMPTS" },
  skipSuccessfulRequests: true,
});

export const requireAuth = (request, response, next) => {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return response.status(401).json({ error: "AUTH_REQUIRED" });
  try {
    request.auth = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return response.status(401).json({ error: "INVALID_TOKEN" });
  }
};

export const requireAdmin = async (request, response, next) => {
  try {
    const result = await pool.query("SELECT role FROM users WHERE id = $1", [request.auth?.id]);
    if (result.rows[0]?.role !== "admin") return response.status(403).json({ error: "ADMIN_REQUIRED" });
    return next();
  } catch {
    return response.status(500).json({ error: "ADMIN_CHECK_FAILED" });
  }
};
