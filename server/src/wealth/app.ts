import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { accountRoutes } from "./modules/accounts/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { budgetRoutes } from "./modules/budgets/routes.js";
import { categoryRoutes } from "./modules/categories/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { debtRoutes } from "./modules/debts/routes.js";
import { deviceRoutes } from "./modules/devices/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { subscriptionRoutes } from "./modules/subscriptions/routes.js";
import { transactionRoutes } from "./modules/transactions/routes.js";
import { receiptRoutes } from "./modules/transactions/receipt-routes.js";
import { reportRoutes } from "./modules/reports/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { ApiError, errorHandler } from "./errors.js";
import { prisma } from "./db.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) throw new Error("CORS_ORIGIN must be configured in production");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) callback(null, true);
    else callback(new ApiError(403, "CORS_ORIGIN_NOT_ALLOWED", "This origin is not allowed"));
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: "1mb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT ?? 300),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } },
}));

app.get("/health", async (_request, response) => {
  await prisma.$queryRaw`SELECT 1`;
  response.json({ success: true, data: { service: "moliyam-wealth-api", status: "ready" } });
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", receiptRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use((_request, response) => response.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }));
app.use(errorHandler);