import { AccountType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const idSchema = z.string().uuid();
const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.nativeEnum(AccountType),
  mask: z.string().trim().max(32).optional(),
  currency: z.enum(["UZS", "USD", "EUR"]).default("UZS"),
  isDefault: z.boolean().default(false),
}).strict();
const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  mask: z.string().trim().max(32).nullable().optional(),
  isDefault: z.boolean().optional(),
}).strict();

router.use(requireAuth);

router.get("/", async (request, response) => {
  const data = await prisma.account.findMany({ where: { userId: requireUserId(request) }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  response.json({ success: true, data });
});

router.post("/", async (request, response) => {
  const input = createSchema.parse(request.body);
  const userId = requireUserId(request);
  const data = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM wealth_users WHERE id = ${userId}::uuid FOR UPDATE`;
    const subscription = await tx.subscription.findUnique({ where: { userId }, include: { plan: { select: { maxAccounts: true } } } });
    const maxAccounts = subscription?.status === "ACTIVE" && (!subscription.expiresAt || subscription.expiresAt > new Date()) ? subscription.plan.maxAccounts : 2;
    if (maxAccounts !== null && await tx.account.count({ where: { userId } }) >= maxAccounts) throw new ApiError(403, "ACCOUNT_LIMIT_REACHED", "The current plan account limit has been reached");
    if (input.isDefault) await tx.account.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.account.create({ data: { userId, ...input, balance: "0.00" } });
  }, { isolationLevel: "Serializable" });
  response.status(201).json({ success: true, data });
});

router.patch("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = patchSchema.parse(request.body);
  if (!Object.keys(input).length) throw new ApiError(400, "EMPTY_UPDATE", "At least one account field must be provided");
  const userId = requireUserId(request);
  const data = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM wealth_users WHERE id = ${userId}::uuid FOR UPDATE`;
    const account = await tx.account.findFirst({ where: { id, userId }, select: { id: true } });
    if (!account) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "The account was not found");
    if (input.isDefault) await tx.account.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.account.update({ where: { id }, data: input });
  });
  response.json({ success: true, data });
});

router.delete("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const userId = requireUserId(request);
  const account = await prisma.account.findFirst({ where: { id, userId }, include: { _count: { select: { transactions: true, transfersIn: true, ledgerEntries: true, debtPayments: true } } } });
  if (!account) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "The account was not found");
  if (!account.balance.isZero() || Object.values(account._count).some((count) => count > 0)) throw new ApiError(409, "ACCOUNT_HAS_HISTORY", "Accounts with a balance or financial history cannot be deleted");
  await prisma.account.delete({ where: { id } });
  response.json({ success: true, data: { deleted: true } });
});

export { router as accountRoutes };