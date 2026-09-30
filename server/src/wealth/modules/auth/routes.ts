import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { DevicePlatform } from "@prisma/client";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { Redis } from "ioredis";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Too many authentication attempts" } } });
const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  email: z.string().trim().email().max(254).optional(),
  password: z.string().min(8).max(128),
  currency: z.enum(["UZS", "USD", "EUR"]).default("UZS"),
  language: z.string().trim().min(2).max(10).default("uz"),
  deviceId: z.string().trim().min(1).max(200).optional(),
  deviceName: z.string().trim().max(120).optional(),
}).strict().refine((data) => Boolean(data.phone || data.email), { message: "A phone number or email is required" });
const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
  deviceId: z.string().trim().min(1).max(200).optional(),
  deviceName: z.string().trim().max(120).optional(),
}).strict();
const refreshSchema = z.object({ refreshToken: z.string().min(32).max(200) }).strict();
const otpPhoneSchema = z.object({ phone: z.string().regex(/^\+[1-9]\d{7,14}$/) }).strict();
const otpVerifySchema = otpPhoneSchema.extend({ otp: z.string().regex(/^\d{6}$/), deviceId: z.string().trim().min(1).max(200).optional(), deviceName: z.string().trim().max(120).optional() }).strict();
const DUMMY_PASSWORD_HASH = "$2b$12$KIXQnqMGG2q7h7J6HlTe7OeF8lp31VUGT3m2kHkaRk53p1zHcK0Va";
const SESSION_DAYS = 30;
const OTP_TTL_SECONDS = 120;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const otpVerifyScript = `
local stored = redis.call('GET', KEYS[1])
if not stored then return -1 end
local attempts = tonumber(redis.call('GET', KEYS[2]) or '0')
if attempts >= tonumber(ARGV[2]) then redis.call('DEL', KEYS[1]); return -2 end
if stored ~= ARGV[1] then
  attempts = redis.call('INCR', KEYS[2])
  if attempts == 1 then redis.call('EXPIRE', KEYS[2], tonumber(ARGV[3])) end
  if attempts >= tonumber(ARGV[2]) then redis.call('DEL', KEYS[1]) end
  return 0
end
redis.call('DEL', KEYS[1], KEYS[2])
return 1
`;

let redis: Redis | undefined;
const getRedis = () => {
  if (!process.env.REDIS_URL) throw new ApiError(503, "OTP_UNAVAILABLE", "OTP verification is not configured");
  redis ??= new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  return redis;
};
const refreshHash = (token: string) => createHmac("sha256", process.env.JWT_REFRESH_SECRET!).update(token).digest("hex");
const otpKey = (phone: string) => createHmac("sha256", process.env.OTP_HMAC_SECRET!).update(phone).digest("hex");
const otpDigest = (phone: string, code: string) => createHmac("sha256", process.env.OTP_HMAC_SECRET!).update(`${phone}:${code}`).digest("hex");
const signAccessToken = (userId: string, sessionId: string) => jwt.sign({ sid: sessionId, tokenType: "access" }, process.env.JWT_ACCESS_SECRET!, {
  subject: userId,
  issuer: "moliyam-wealth",
  audience: "moliyam-android",
  algorithm: "HS256",
  expiresIn: "15m",
});

const publicUser = (user: { id: string; phone: string | null; fullName: string; email: string | null; avatarUrl: string | null; currency: string; language: string; phoneVerifiedAt: Date | null; emailVerifiedAt: Date | null; pinEnabled: boolean; biometricEnabled: boolean; createdAt: Date }) => ({
  id: user.id,
  phone: user.phone,
  fullName: user.fullName,
  email: user.email,
  avatarUrl: user.avatarUrl,
  currency: user.currency,
  language: user.language,
  phoneVerifiedAt: user.phoneVerifiedAt,
  emailVerifiedAt: user.emailVerifiedAt,
  pinEnabled: user.pinEnabled,
  biometricEnabled: user.biometricEnabled,
  createdAt: user.createdAt,
});

const createSession = async (user: { id: string }, request: Parameters<Parameters<typeof router.post>[1]>[0], deviceId?: string, deviceName?: string) => {
  const refreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: {
    userId: user.id,
    refreshTokenHash: refreshHash(refreshToken),
    deviceId: deviceId ?? null,
    deviceName: deviceName ?? null,
    ipAddress: request.ip,
    userAgent: request.get("user-agent")?.slice(0, 500),
    expiresAt,
  }, select: { id: true } });
  const accessToken = signAccessToken(user.id, session.id);
  return { accessToken, refreshToken, expiresIn: 900 };
};

router.post("/register", authLimiter, async (request, response) => {
  const input = registerSchema.parse(request.body);
  try {
    const user = await prisma.user.create({ data: {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email?.toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 12),
      currency: input.currency,
      language: input.language,
    }, select: { id: true, phone: true, fullName: true, email: true, avatarUrl: true, currency: true, language: true, phoneVerifiedAt: true, emailVerifiedAt: true, pinEnabled: true, biometricEnabled: true, createdAt: true } });
    const tokens = await createSession(user, request, input.deviceId, input.deviceName);
    response.status(201).json({ success: true, data: { user: publicUser(user), ...tokens } });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") throw new ApiError(409, "ACCOUNT_ALREADY_EXISTS", "An account with these details already exists");
    throw error;
  }
});

router.post("/login", authLimiter, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const identifier = input.identifier.includes("@") ? input.identifier.toLowerCase() : input.identifier;
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier }, { phone: identifier }], isActive: true } });
  const passwordIsValid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.passwordHash || !passwordIsValid) throw new ApiError(401, "INVALID_CREDENTIALS", "The supplied credentials are invalid");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const tokens = await createSession(user, request, input.deviceId, input.deviceName);
  response.json({ success: true, data: { user: publicUser(user), ...tokens } });
});

router.post("/refresh", authLimiter, async (request, response) => {
  const { refreshToken } = refreshSchema.parse(request.body);
  const oldHash = refreshHash(refreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: oldHash }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) throw new ApiError(401, "INVALID_REFRESH_TOKEN", "The refresh token is invalid or expired");
  const rotatedToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const updated = await prisma.session.updateMany({
    where: { id: session.id, userId: session.userId, refreshTokenHash: oldHash, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { refreshTokenHash: refreshHash(rotatedToken), expiresAt },
  });
  if (updated.count !== 1) throw new ApiError(401, "REFRESH_TOKEN_REUSED", "The refresh token has already been rotated");
  response.json({ success: true, data: { accessToken: signAccessToken(session.userId, session.id), refreshToken: rotatedToken, expiresIn: 900 } });
});

router.post("/logout", requireAuth, async (request, response) => {
  await prisma.session.updateMany({ where: { id: request.auth!.sessionId, userId: requireUserId(request), revokedAt: null }, data: { revokedAt: new Date() } });
  response.json({ success: true, data: { loggedOut: true } });
});

router.post("/send-otp", authLimiter, async (request, response) => {
  const { phone } = otpPhoneSchema.parse(request.body);
  if (!process.env.OTP_HMAC_SECRET || process.env.OTP_HMAC_SECRET.length < 32) throw new ApiError(503, "OTP_UNAVAILABLE", "OTP verification is not configured");
  const gateway = process.env.SMS_GATEWAY_URL;
  const gatewayToken = process.env.SMS_GATEWAY_TOKEN;
  if (!gateway || !gatewayToken || !gateway.startsWith("https://")) throw new ApiError(503, "OTP_DELIVERY_UNAVAILABLE", "OTP delivery is not configured");
  const store = getRedis();
  const key = otpKey(phone);
  const allowed = await store.set(`otp:resend:${key}`, "1", "EX", OTP_RESEND_SECONDS, "NX");
  if (!allowed) throw new ApiError(429, "OTP_RESEND_LIMIT", "Please wait before requesting another code");
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeKey = `otp:code:${key}`;
  try {
    await store.set(codeKey, otpDigest(phone, code), "EX", OTP_TTL_SECONDS);
    const delivery = await fetch(gateway, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${gatewayToken}` },
      body: JSON.stringify({ to: phone, message: `Moliyam verification code: ${code}` }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!delivery.ok) throw new Error("SMS provider rejected the request");
  } catch {
    await store.del(codeKey, `otp:resend:${key}`);
    throw new ApiError(503, "OTP_DELIVERY_FAILED", "The verification code could not be delivered");
  }
  response.status(202).json({ success: true, data: { expiresIn: OTP_TTL_SECONDS, resendAfter: OTP_RESEND_SECONDS } });
});

router.post("/verify-otp", authLimiter, async (request, response) => {
  const input = otpVerifySchema.parse(request.body);
  if (!process.env.OTP_HMAC_SECRET || process.env.OTP_HMAC_SECRET.length < 32) throw new ApiError(503, "OTP_UNAVAILABLE", "OTP verification is not configured");
  const store = getRedis();
  const key = otpKey(input.phone);
  const result = Number(await store.eval(otpVerifyScript, 2, `otp:code:${key}`, `otp:attempts:${key}`, otpDigest(input.phone, input.otp), OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS));
  if (result !== 1) throw new ApiError(401, "INVALID_OTP", "The verification code is invalid or expired");
  const user = await prisma.user.findFirst({ where: { phone: input.phone, isActive: true } });
  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "No account is registered with this phone number");
  const verifiedUser = await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(), lastLoginAt: new Date() } });
  const tokens = await createSession(verifiedUser, request, input.deviceId, input.deviceName);
  response.json({ success: true, data: { user: publicUser(verifiedUser), ...tokens } });
});

export { router as authRoutes };