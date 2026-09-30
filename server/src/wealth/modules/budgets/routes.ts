import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { BudgetService } from "./service.js";

const router = Router();
const service = new BudgetService(prisma);
const limitSchema = z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).max(19).refine((value) => new Prisma.Decimal(value).gt(0));
const categorySchema = z.object({ categoryId: z.string().uuid(), limit: limitSchema }).strict();
const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  totalLimit: limitSchema,
  categories: z.array(categorySchema).max(100).default([]),
}).strict().refine((input) => new Set(input.categories.map(({ categoryId }) => categoryId)).size === input.categories.length, { message: "Category limits must not contain duplicates" });
const patchSchema = z.object({
  totalLimit: limitSchema.optional(),
  categories: z.array(categorySchema).max(100).optional(),
}).strict().refine((input) => input.totalLimit !== undefined || input.categories !== undefined, { message: "At least one budget field must be provided" }).refine((input) => !input.categories || new Set(input.categories.map(({ categoryId }) => categoryId)).size === input.categories.length, { message: "Category limits must not contain duplicates" });
const idSchema = z.string().uuid();
const monthQuery = z.object({ month: z.coerce.number().int().min(1).max(12).optional(), year: z.coerce.number().int().min(2000).max(2100).optional() }).strict();

router.use(requireAuth);

router.get("/current", async (request, response) => {
  const query = monthQuery.parse(request.query);
  const now = new Date();
  const data = await service.calculate(requireUserId(request), query.month ?? now.getUTCMonth() + 1, query.year ?? now.getUTCFullYear());
  response.json({ success: true, data });
});

router.get("/", async (request, response) => {
  const userId = requireUserId(request);
  const budgets = await prisma.budget.findMany({ where: { userId }, orderBy: [{ year: "desc" }, { month: "desc" }], take: 24 });
  const data = await Promise.all(budgets.map(({ month, year }) => service.calculate(userId, month, year)));
  response.json({ success: true, data });
});

router.post("/", async (request, response) => {
  const input = createSchema.parse(request.body);
  const userId = requireUserId(request);
  await service.validateCategories(userId, input.categories.map(({ categoryId }) => categoryId));
  try {
    const data = await prisma.budget.create({ data: {
      userId,
      month: input.month,
      year: input.year,
      totalLimit: input.totalLimit,
      categories: { create: input.categories.map(({ categoryId, limit }) => ({ categoryId, limit })) },
    }, select: { id: true, userId: true, month: true, year: true, totalLimit: true, createdAt: true, updatedAt: true } });
    response.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") throw new ApiError(409, "BUDGET_ALREADY_EXISTS", "A budget already exists for that month");
    throw error;
  }
});

router.patch("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = patchSchema.parse(request.body);
  const userId = requireUserId(request);
  if (input.categories) await service.validateCategories(userId, input.categories.map(({ categoryId }) => categoryId));
  const data = await prisma.$transaction(async (tx) => {
    const budget = await tx.budget.findFirst({ where: { id, userId }, select: { id: true } });
    if (!budget) throw new ApiError(404, "BUDGET_NOT_FOUND", "The budget was not found");
    if (input.categories) {
      await tx.budgetCategory.deleteMany({ where: { budgetId: id } });
      if (input.categories.length) await tx.budgetCategory.createMany({ data: input.categories.map(({ categoryId, limit }) => ({ budgetId: id, categoryId, limit })) });
    }
    return tx.budget.update({ where: { id }, data: { totalLimit: input.totalLimit } });
  });
  response.json({ success: true, data });
});

router.delete("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const result = await prisma.budget.deleteMany({ where: { id, userId: requireUserId(request) } });
  if (!result.count) throw new ApiError(404, "BUDGET_NOT_FOUND", "The budget was not found");
  response.json({ success: true, data: { deleted: true } });
});

export { router as budgetRoutes };