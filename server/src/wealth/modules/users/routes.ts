import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const patchSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  currency: z.enum(["UZS", "USD", "EUR"]).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  pinEnabled: z.boolean().optional(),
  biometricEnabled: z.boolean().optional(),
}).strict();
const safeSelect = { id: true, phone: true, fullName: true, email: true, avatarUrl: true, currency: true, language: true, phoneVerifiedAt: true, emailVerifiedAt: true, pinEnabled: true, biometricEnabled: true, lastLoginAt: true, createdAt: true, updatedAt: true } as const;

router.use(requireAuth);

router.get("/me", async (request, response) => {
  const user = await prisma.user.findUnique({ where: { id: requireUserId(request) }, select: safeSelect });
  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "The account was not found");
  response.json({ success: true, data: user });
});

router.patch("/me", async (request, response) => {
  const input = patchSchema.parse(request.body);
  if (!Object.keys(input).length) throw new ApiError(400, "EMPTY_UPDATE", "At least one profile field must be provided");
  try {
    const userId = requireUserId(request);
    const current = input.email === undefined ? null : await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const email = input.email === undefined ? undefined : input.email?.toLowerCase() ?? null;
    const emailChanged = current !== null && email !== current.email;
    const user = await prisma.user.update({ where: { id: userId }, data: { ...input, email, ...(emailChanged ? { emailVerifiedAt: null } : {}) }, select: safeSelect });
    response.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    throw error;
  }
});

export { router as userRoutes };