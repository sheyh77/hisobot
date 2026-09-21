import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import crypto from "node:crypto";
import { pool } from "./db.js";
import { requireAdmin, requireAuth, signUser } from "./auth.js";

dotenv.config();
const app = express();
const fcmReady = Boolean(process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY && process.env.FCM_PROJECT_ID);
if (fcmReady && !admin.apps.length) admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FCM_PROJECT_ID, clientEmail: process.env.FCM_CLIENT_EMAIL, privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const defaultOrigins = [
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "http://localhost:5173",
];
const corsOrigins = [...new Set([...defaultOrigins, ...allowedOrigins])];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS_ORIGIN_NOT_ALLOWED"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

const userShape = (row) => ({ id: row.id, username: row.username, email: row.email, role: row.role, plan: row.plan, expiresAt: row.plan_expires_at });

app.get("/health", (_request, response) => response.json({ ok: true, service: "moliyam-api" }));

app.post("/api/auth/register", async (request, response) => {
  const { username, email, password } = request.body;
  if (!username?.trim() || !email?.trim() || !password || password.length < 6) return response.status(400).json({ error: "USERNAME_EMAIL_PASSWORD_REQUIRED" });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query("INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *", [username.trim(), email.trim().toLowerCase(), passwordHash]);
    const user = userShape(result.rows[0]);
    return response.status(201).json({ user, token: signUser(result.rows[0]) });
  } catch (error) {
    return response.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "EMAIL_ALREADY_EXISTS" : "REGISTER_FAILED" });
  }
});

app.post("/api/auth/login", async (request, response) => {
  const { email, password } = request.body;
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
  const result = await pool.query("UPDATE users SET username = COALESCE($1,username), email = COALESCE($2,email), phone = COALESCE($3,phone), address = COALESCE($4,address), avatar = COALESCE($5,avatar), notification_settings = COALESCE($6,notification_settings), updated_at = NOW() WHERE id = $7 RETURNING *", [username, email, phone, address, avatar, notificationSettings ? JSON.stringify(notificationSettings) : null, request.auth.id]);
  response.json({ user: { ...userShape(result.rows[0]), phone: result.rows[0].phone, address: result.rows[0].address, avatar: result.rows[0].avatar, notificationSettings: result.rows[0].notification_settings } });
});

app.get("/api/transactions", requireAuth, async (request, response) => {
  const result = await pool.query("SELECT id, user_id AS \"userId\", amount, type, category, description AS desc, due_date AS \"dueDate\", status, created_at AS \"createdAt\", spent_at AS \"spentAt\" FROM transactions WHERE user_id = $1 ORDER BY created_at DESC", [request.auth.id]);
  response.json(result.rows);
});

app.post("/api/transactions", requireAuth, async (request, response) => {
  const { amount, type, category = "Umumiy", desc = "", dueDate = null, status = "completed" } = request.body;
  const result = await pool.query("INSERT INTO transactions (user_id, amount, type, category, description, due_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, user_id AS \"userId\", amount, type, category, description AS desc, due_date AS \"dueDate\", status, created_at AS \"createdAt\"", [request.auth.id, amount, type, category, desc, dueDate, status]);
  response.status(201).json(result.rows[0]);
});

app.patch("/api/transactions/:id", requireAuth, async (request, response) => {
  const result = await pool.query("UPDATE transactions SET status = COALESCE($1,status), spent_at = COALESCE($2,spent_at) WHERE id = $3 AND user_id = $4 RETURNING *", [request.body.status, request.body.spentAt, request.params.id, request.auth.id]);
  if (!result.rows[0]) return response.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
  response.json(result.rows[0]);
});
app.get("/api/admin/transactions", requireAuth, requireAdmin, async (_request, response) => response.json((await pool.query("SELECT id, user_id AS \"userId\", amount, type, category, description AS desc, due_date AS \"dueDate\", status, created_at AS \"createdAt\" FROM transactions ORDER BY created_at DESC")).rows));
app.get("/api/categories", requireAuth, async (_request, response) => response.json((await pool.query("SELECT id, name, color FROM categories ORDER BY name")).rows));
app.post("/api/admin/categories", requireAuth, requireAdmin, async (request, response) => { const result = await pool.query("INSERT INTO categories (name,color) VALUES ($1,$2) RETURNING id,name,color", [request.body.name, request.body.color || "#159a78"]); response.status(201).json(result.rows[0]); });
app.delete("/api/admin/categories/:id", requireAuth, requireAdmin, async (request, response) => { await pool.query("DELETE FROM categories WHERE id = $1", [request.params.id]); response.status(204).end(); });

app.post("/api/device-tokens", requireAuth, async (request, response) => {
  await pool.query("INSERT INTO device_tokens (user_id, token, platform) VALUES ($1,$2,$3) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id", [request.auth.id, request.body.token, request.body.platform || "android"]);
  response.status(204).end();
});

app.get("/api/payment-requests", requireAuth, async (request, response) => response.json((await pool.query("SELECT id, user_id AS \"userId\", receipt_url AS \"receiptUrl\", status, admin_note AS \"adminNote\", created_at AS \"createdAt\" FROM payment_requests WHERE user_id = $1 ORDER BY created_at DESC", [request.auth.id])).rows));
app.post("/api/payment-requests", requireAuth, async (request, response) => { const result = await pool.query("INSERT INTO payment_requests (user_id, receipt_url) VALUES ($1,$2) RETURNING id, user_id AS \"userId\", receipt_url AS \"receiptUrl\", status, created_at AS \"createdAt\"", [request.auth.id, request.body.receiptUrl]); response.status(201).json(result.rows[0]); });
app.get("/api/admin/payment-requests", requireAuth, requireAdmin, async (_request, response) => response.json((await pool.query("SELECT id, user_id AS \"userId\", receipt_url AS \"receiptUrl\", status, admin_note AS \"adminNote\", created_at AS \"createdAt\" FROM payment_requests ORDER BY created_at DESC")).rows));
app.patch("/api/admin/payment-requests/:id", requireAuth, requireAdmin, async (request, response) => { const result = await pool.query("UPDATE payment_requests SET status = $1, reviewed_at = NOW(), admin_note = $2 WHERE id = $3 RETURNING *", [request.body.status, request.body.adminNote || null, request.params.id]); if (!result.rows[0]) return response.status(404).json({ error: "PAYMENT_REQUEST_NOT_FOUND" }); response.json(result.rows[0]); });

app.get("/api/notifications", requireAuth, async (request, response) => {
  const result = await pool.query("SELECT * FROM notifications WHERE audience = 'all' OR audience = $1 ORDER BY created_at DESC", [request.auth.id]);
  response.json(result.rows);
});

app.post("/api/admin/notifications", requireAuth, requireAdmin, async (request, response) => {
  const { title, body, audience = "all" } = request.body;
  const result = await pool.query("INSERT INTO notifications (audience,title,body) VALUES ($1,$2,$3) RETURNING *", [audience, title, body]);
  if (fcmReady) {
    const tokenQuery = audience === "all" ? "SELECT token FROM device_tokens" : "SELECT token FROM device_tokens WHERE user_id = $1";
    const tokens = (await pool.query(tokenQuery, audience === "all" ? [] : [audience])).rows.map((row) => row.token);
    if (tokens.length) await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body } });
  }
  response.status(201).json(result.rows[0]);
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (_request, response) => {
  const result = await pool.query("SELECT id, username, email, role, plan, plan_expires_at AS \"expiresAt\", created_at AS \"createdAt\" FROM users ORDER BY created_at DESC");
  response.json(result.rows);
});
app.patch("/api/admin/users/:id/entitlement", requireAuth, requireAdmin, async (request, response) => { const result = await pool.query("UPDATE users SET plan = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3 RETURNING id, plan, plan_expires_at AS \"expiresAt\"", [request.body.plan, request.body.expiresAt || null, request.params.id]); if (!result.rows[0]) return response.status(404).json({ error: "USER_NOT_FOUND" }); response.json(result.rows[0]); });

app.get("/api/payment-methods", requireAuth, async (_request, response) => response.json((await pool.query("SELECT id, bank_name AS \"bankName\", card_number AS \"cardNumber\", holder_name AS \"holderName\", price_label AS price FROM payment_methods WHERE active = true ORDER BY created_at DESC")).rows));
app.post("/api/admin/payment-methods", requireAuth, requireAdmin, async (request, response) => { const { bankName, cardNumber, holderName, price } = request.body; const result = await pool.query("INSERT INTO payment_methods (bank_name,card_number,holder_name,price_label) VALUES ($1,$2,$3,$4) RETURNING *", [bankName, cardNumber, holderName || "", price || null]); response.status(201).json(result.rows[0]); });
app.delete("/api/admin/payment-methods/:id", requireAuth, requireAdmin, async (request, response) => { await pool.query("DELETE FROM payment_methods WHERE id = $1", [request.params.id]); response.status(204).end(); });

app.use((_request, response) => response.status(404).json({ error: "NOT_FOUND" }));
app.listen(process.env.PORT || 5000, () => console.log(`Moliyam API listening on ${process.env.PORT || 5000}`));
