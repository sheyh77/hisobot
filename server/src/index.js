import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "node:crypto";
import { pool } from "./db.js";
import { authRateLimit, requireAdmin, requireAuth, signUser } from "./auth.js";

dotenv.config();
console.log("JWT DEBUG:", {
  exists: Boolean(process.env.JWT_SECRET),
  length: process.env.JWT_SECRET?.length ?? 0,
  nodeEnv: process.env.NODE_ENV,
});

if (
  process.env.NODE_ENV === "production" &&
  (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET === "replace_with_a_long_random_secret"
  )
) {
  throw new Error("JWT_SECRET must be a strong production secret of at least 32 characters");
}
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === "replace_with_a_long_random_secret")) {
  throw new Error("JWT_SECRET must be a strong production secret of at least 32 characters");
}
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const fcmReady = Boolean(
  process.env.FCM_CLIENT_EMAIL?.includes("@") &&
  process.env.FCM_PRIVATE_KEY?.includes("BEGIN PRIVATE KEY") &&
  process.env.FCM_PROJECT_ID?.trim(),
);
if (process.env.NODE_ENV === "production" && !fcmReady) throw new Error("FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY, and FCM_PROJECT_ID are required in production");
if (fcmReady && !admin.apps.length) admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FCM_PROJECT_ID, clientEmail: process.env.FCM_CLIENT_EMAIL, privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, "");
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const defaultOrigins = [
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "http://localhost:5173",
  "https://hisobot-umber.vercel.app",
];
const corsOrigins = [...new Set([...defaultOrigins, ...allowedOrigins])];
const getPageParams = (request, maxLimit = 100) => {
  const page = Math.max(1, Number.parseInt(request.query.page || "1", 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(request.query.limit || "50", 10) || 50));
  return { limit, offset: (page - 1) * limit };
};
const isValidEmail = (value) => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS_ORIGIN_NOT_ALLOWED"));
  },
  credentials: true,
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT || 300),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS" },
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

const userShape = (row) => ({ id: row.id, username: row.username, email: row.email, role: row.role, plan: row.plan, expiresAt: row.plan_expires_at });

app.get("/health", (_request, response) => response.json({ ok: true, service: "moliyam-api", fcmReady }));

app.post("/api/auth/register", authRateLimit, async (request, response) => {
  const { username, email, password } = request.body;
  if (!username?.trim() || username.trim().length > 80 || !isValidEmail(email?.trim().toLowerCase()) || !password || password.length < 6 || password.length > 128) return response.status(400).json({ error: "USERNAME_EMAIL_PASSWORD_REQUIRED" });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query("INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *", [username.trim(), email.trim().toLowerCase(), passwordHash]);
    const user = userShape(result.rows[0]);
    return response.status(201).json({ user, token: signUser(result.rows[0]) });
  } catch (error) {
    return response.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "EMAIL_ALREADY_EXISTS" : "REGISTER_FAILED" });
  }
});

app.post("/api/auth/login", authRateLimit, async (request, response) => {
  const { email, password } = request.body;
  if (!isValidEmail(email?.trim().toLowerCase()) || typeof password !== "string" || password.length > 128) return response.status(401).json({ error: "INVALID_CREDENTIALS" });
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email?.trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) return response.status(401).json({ error: "INVALID_CREDENTIALS" });
  return response.json({ user: userShape(user), token: signUser(user) });
});

app.get("/api/me", requireAuth, async (request, response) => {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [request.auth.id]);
  if (!result.rows[0]) return response.status(404).json({ error: "USER_NOT_FOUND" });
  response.json({ user: userShape(result.rows[0]) });
});
app.patch("/api/me", requireAuth, async (request, response) => {
  const { username, email, phone, address, avatar, notificationSettings } = request.body;
  if (username !== undefined && (typeof username !== "string" || username.trim().length === 0 || username.trim().length > 80)) return response.status(400).json({ error: "INVALID_USERNAME" });
  if (email !== undefined && !isValidEmail(String(email).trim().toLowerCase())) return response.status(400).json({ error: "INVALID_EMAIL" });
  if (phone !== undefined && (typeof phone !== "string" || phone.length > 40)) return response.status(400).json({ error: "INVALID_PHONE" });
  if (address !== undefined && (typeof address !== "string" || address.length > 240)) return response.status(400).json({ error: "INVALID_ADDRESS" });
  if (avatar !== undefined && (typeof avatar !== "string" || avatar.length > 2_000_000)) return response.status(400).json({ error: "INVALID_AVATAR" });
  const result = await pool.query("UPDATE users SET username = COALESCE($1,username), email = COALESCE($2,email), phone = COALESCE($3,phone), address = COALESCE($4,address), avatar = COALESCE($5,avatar), notification_settings = COALESCE($6,notification_settings), updated_at = NOW() WHERE id = $7 RETURNING *", [username, email, phone, address, avatar, notificationSettings ? JSON.stringify(notificationSettings) : null, request.auth.id]);
  response.json({ user: { ...userShape(result.rows[0]), phone: result.rows[0].phone, address: result.rows[0].address, avatar: result.rows[0].avatar, notificationSettings: result.rows[0].notification_settings } });
});

app.get("/api/transactions", requireAuth, async (request, response) => {
  const result = await pool.query("SELECT id, user_id AS \"userId\", amount, type, category, description AS desc, due_date AS \"dueDate\", status, created_at AS \"createdAt\", spent_at AS \"spentAt\" FROM transactions WHERE user_id = $1 ORDER BY created_at DESC", [request.auth.id]);
  response.json(result.rows);
});

app.post("/api/transactions", requireAuth, async (request, response) => {
  const { amount, type, category = "Umumiy", desc = "", dueDate = null, status = "completed" } = request.body;
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > 100_000_000_000 || !["kirim", "chiqim"].includes(type) || typeof category !== "string" || category.length > 100 || typeof desc !== "string" || desc.length > 500 || (dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) || !["planned", "completed"].includes(status)) return response.status(400).json({ error: "INVALID_TRANSACTION" });
  const result = await pool.query("INSERT INTO transactions (user_id, amount, type, category, description, due_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, user_id AS \"userId\", amount, type, category, description AS desc, due_date AS \"dueDate\", status, created_at AS \"createdAt\"", [request.auth.id, amount, type, category, desc, dueDate, status]);
  response.status(201).json(result.rows[0]);
});

app.patch("/api/transactions/:id", requireAuth, async (request, response) => {
  if (!request.body || !["planned", "completed"].includes(request.body.status)) return response.status(400).json({ error: "INVALID_TRANSACTION_STATUS" });
  const result = await pool.query("UPDATE transactions SET status = COALESCE($1,status), spent_at = COALESCE($2,spent_at) WHERE id = $3 AND user_id = $4 RETURNING *", [request.body.status, request.body.spentAt, request.params.id, request.auth.id]);
  if (!result.rows[0]) return response.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
  response.json(result.rows[0]);
});
app.get("/api/admin/transactions", requireAuth, requireAdmin, async (request, response) => { const { limit, offset } = getPageParams(request); response.json((await pool.query("SELECT id, user_id AS \"userId\", amount, type, category, description AS desc, due_date AS \"dueDate\", status, created_at AS \"createdAt\" FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset])).rows); });
app.get("/api/categories", requireAuth, async (_request, response) => response.json((await pool.query("SELECT id, name, color FROM categories ORDER BY name LIMIT 100")).rows));
app.post("/api/admin/categories", requireAuth, requireAdmin, async (request, response) => { const { name, color = "#159a78" } = request.body; if (typeof name !== "string" || !name.trim() || name.length > 80 || typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return response.status(400).json({ error: "INVALID_CATEGORY" }); const result = await pool.query("INSERT INTO categories (name,color) VALUES ($1,$2) RETURNING id,name,color", [name.trim(), color]); response.status(201).json(result.rows[0]); });
app.delete("/api/admin/categories/:id", requireAuth, requireAdmin, async (request, response) => { await pool.query("DELETE FROM categories WHERE id = $1", [request.params.id]); response.status(204).end(); });

app.post("/api/device-tokens", requireAuth, async (request, response) => {
  if (typeof request.body.token !== "string" || request.body.token.length < 10 || request.body.token.length > 4096) return response.status(400).json({ error: "INVALID_DEVICE_TOKEN" });
  const platform = ["android", "ios", "web"].includes(request.body.platform) ? request.body.platform : "android";
  await pool.query("INSERT INTO device_tokens (user_id, token, platform) VALUES ($1,$2,$3) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform", [request.auth.id, request.body.token, platform]);
  response.status(204).end();
});

app.get("/api/payment-requests", requireAuth, async (request, response) => { const { limit, offset } = getPageParams(request); response.json((await pool.query("SELECT id, user_id AS \"userId\", receipt_url AS \"receiptUrl\", status, admin_note AS \"adminNote\", created_at AS \"createdAt\" FROM payment_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", [request.auth.id, limit, offset])).rows); });
app.post("/api/payment-requests", requireAuth, async (request, response) => { if (typeof request.body.receiptUrl !== "string" || request.body.receiptUrl.length > 2_000_000) return response.status(400).json({ error: "INVALID_RECEIPT" }); const result = await pool.query("INSERT INTO payment_requests (user_id, receipt_url) VALUES ($1,$2) RETURNING id, user_id AS \"userId\", receipt_url AS \"receiptUrl\", status, created_at AS \"createdAt\"", [request.auth.id, request.body.receiptUrl]); response.status(201).json(result.rows[0]); });
app.get("/api/admin/payment-requests", requireAuth, requireAdmin, async (request, response) => { const { limit, offset } = getPageParams(request); response.json((await pool.query("SELECT id, user_id AS \"userId\", receipt_url AS \"receiptUrl\", status, admin_note AS \"adminNote\", created_at AS \"createdAt\" FROM payment_requests ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset])).rows); });
app.patch("/api/admin/payment-requests/:id", requireAuth, requireAdmin, async (request, response) => { if (!["approved", "rejected"].includes(request.body.status) || (request.body.adminNote !== undefined && (typeof request.body.adminNote !== "string" || request.body.adminNote.length > 500))) return response.status(400).json({ error: "INVALID_PAYMENT_STATUS" }); const result = await pool.query("UPDATE payment_requests SET status = $1, reviewed_at = NOW(), admin_note = $2 WHERE id = $3 RETURNING *", [request.body.status, request.body.adminNote || null, request.params.id]); if (!result.rows[0]) return response.status(404).json({ error: "PAYMENT_REQUEST_NOT_FOUND" }); response.json(result.rows[0]); });

app.get("/api/notifications", requireAuth, async (request, response) => {
  const { limit, offset } = getPageParams(request);
  const result = await pool.query("SELECT id, audience, title, body, status, sent_count AS \"sentCount\", created_at AS \"createdAt\", sent_at AS \"sentAt\" FROM notifications WHERE audience = 'all' OR audience = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", [request.auth.id, limit, offset]);
  response.json(result.rows);
});

app.post("/api/admin/notifications", requireAuth, requireAdmin, async (request, response) => {
  const { title, body, audience = "all" } = request.body;
  if (typeof title !== "string" || !title.trim() || title.length > 160 || typeof body !== "string" || !body.trim() || body.length > 2000 || (audience !== "all" && typeof audience !== "string")) return response.status(400).json({ error: "INVALID_NOTIFICATION" });
  const notificationResult = await pool.query("INSERT INTO notifications (audience,title,body) VALUES ($1,$2,$3) RETURNING *", [audience, title, body]);
  if (fcmReady) {
    const tokenQuery = audience === "all" ? "SELECT token FROM device_tokens" : "SELECT token FROM device_tokens WHERE user_id = $1";
    const tokens = (await pool.query(tokenQuery, audience === "all" ? [] : [audience])).rows.map((row) => row.token);
    if (tokens.length) {
      const fcmResult = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: title.trim(), body: body.trim() },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "moliyam-reminders",
            clickAction: "FCM_PLUGIN_ACTIVITY",
          },
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default", alert: { title: title.trim(), body: body.trim() } } },
        },
        webpush: {
          headers: { Urgency: "high", TTL: "86400" },
          notification: { icon: "/images/apk_img.png", requireInteraction: false },
        },
      });
      const invalidTokens = fcmResult.responses
        .map((item, index) => item.success ? null : ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(item.error?.code) ? tokens[index] : null)
        .filter(Boolean);
      if (invalidTokens.length) await pool.query("DELETE FROM device_tokens WHERE token = ANY($1::text[])", [invalidTokens]);
      await pool.query("UPDATE notifications SET status = 'sent', sent_count = $1, sent_at = NOW() WHERE id = $2", [fcmResult.successCount, notificationResult.rows[0].id]);
    }
  }
  response.status(201).json(notificationResult.rows[0]);
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (request, response) => {
  const { limit, offset } = getPageParams(request);
  const result = await pool.query("SELECT id, username, email, role, plan, plan_expires_at AS \"expiresAt\", created_at AS \"createdAt\" FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2", [limit, offset]);
  response.json(result.rows);
});
app.patch("/api/admin/users/:id/entitlement", requireAuth, requireAdmin, async (request, response) => { if (!["free", "pro"].includes(request.body.plan) || (request.body.expiresAt !== undefined && request.body.expiresAt !== null && Number.isNaN(Date.parse(request.body.expiresAt)))) return response.status(400).json({ error: "INVALID_ENTITLEMENT" }); const result = await pool.query("UPDATE users SET plan = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3 RETURNING id, plan, plan_expires_at AS \"expiresAt\"", [request.body.plan, request.body.expiresAt || null, request.params.id]); if (!result.rows[0]) return response.status(404).json({ error: "USER_NOT_FOUND" }); response.json(result.rows[0]); });

app.get("/api/payment-methods", requireAuth, async (_request, response) => response.json((await pool.query("SELECT id, bank_name AS \"bankName\", card_number AS \"cardNumber\", holder_name AS \"holderName\", price_label AS price FROM payment_methods WHERE active = true ORDER BY created_at DESC")).rows));
app.post("/api/admin/payment-methods", requireAuth, requireAdmin, async (request, response) => { const { bankName, cardNumber, holderName, price } = request.body; if (typeof bankName !== "string" || bankName.length > 100 || typeof cardNumber !== "string" || cardNumber.length > 40 || typeof holderName !== "string" || holderName.length > 120 || (price !== undefined && price !== null && String(price).length > 40)) return response.status(400).json({ error: "INVALID_PAYMENT_METHOD" }); const result = await pool.query("INSERT INTO payment_methods (bank_name,card_number,holder_name,price_label) VALUES ($1,$2,$3,$4) RETURNING *", [bankName.trim(), cardNumber.trim(), holderName.trim(), price || null]); response.status(201).json(result.rows[0]); });
app.delete("/api/admin/payment-methods/:id", requireAuth, requireAdmin, async (request, response) => { await pool.query("DELETE FROM payment_methods WHERE id = $1", [request.params.id]); response.status(204).end(); });

app.use((_request, response) => response.status(404).json({ error: "NOT_FOUND" }));
app.use((error, _request, response, _next) => {
  if (error.message === "CORS_ORIGIN_NOT_ALLOWED") return response.status(403).json({ error: "CORS_ORIGIN_NOT_ALLOWED" });
  if (error.type === "entity.too.large") return response.status(413).json({ error: "REQUEST_TOO_LARGE" });
  console.error("Unhandled API error:", error.message);
  return response.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});
app.listen(process.env.PORT || 5000, () => console.log(`Moliyam API listening on ${process.env.PORT || 5000}`));
