import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const signUser = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

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

export const requireAdmin = (request, response, next) => request.auth?.role === "admin" ? next() : response.status(403).json({ error: "ADMIN_REQUIRED" });
