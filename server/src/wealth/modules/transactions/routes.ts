import { TransactionType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { TransactionService } from "./service.js";

const router = Router();
const service = new TransactionService(prisma);
const idSchema = z.string().uuid();
const amountSchema = z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).max(19);
const inputSchema = z.object({
  accountId: idSchema,
  toAccountId: idSchema.nullable().optional(),
  categoryId: idSchema.nullable().optional(),
  type: z.nativeEnum(TransactionType),
  amount: amountSchema,
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  description: z.string().max(500).optional(),
  transactionDate: z.string().datetime({ offset: true }).optional(),
}).strict();
const patchSchema = inputSchema.partial();
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().min(1).max(100).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  categoryId: idSchema.optional(),
  accountId: idSchema.optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
}).strict();

router.use(requireAuth);

router.get("/", async (request, response) => {
  const query = listSchema.parse(request.query);
  if (query.dateFrom && query.dateTo && new Date(query.dateFrom) > new Date(query.dateTo)) throw new ApiError(400, "INVALID_DATE_RANGE", "dateFrom must not be after dateTo");
  const data = await service.list(requireUserId(request), query);
  response.json({ success: true, data });
});

router.post("/", async (request, response) => {
  const input = inputSchema.parse(request.body);
  const data = await service.create(requireUserId(request), input);
  response.status(201).json({ success: true, data });
});

router.get("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const data = await service.get(requireUserId(request), id);
  response.json({ success: true, data });
});

router.patch("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const patch = patchSchema.parse(request.body);
  if (!Object.keys(patch).length) throw new ApiError(400, "EMPTY_UPDATE", "At least one transaction field must be provided");
  const data = await service.update(requireUserId(request), id, patch);
  response.json({ success: true, data });
});

router.delete("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  await service.delete(requireUserId(request), id);
  response.json({ success: true, data: { deleted: true } });
});

export { router as transactionRoutes };