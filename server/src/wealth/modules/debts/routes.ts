import { DebtType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { DebtService } from "./service.js";
import { NotificationService } from "../../services/notifications.js";

const router = Router();
const service = new DebtService(prisma);
const notificationService = new NotificationService();
const amountSchema = z.string().regex(/^\d{1,16}(\.\d{1,2})?$/).max(19);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
const createSchema = z.object({
  personName: z.string().trim().min(1).max(120),
  phone: z.string().max(32).optional(),
  relationship: z.string().max(80).optional(),
  type: z.nativeEnum(DebtType),
  totalAmount: amountSchema,
  dueDate: dateSchema.nullable().optional(),
  notes: z.string().max(2000).optional(),
}).strict();
const patchSchema = createSchema.omit({ type: true, totalAmount: true }).extend({ totalAmount: amountSchema.optional() }).partial().strict();
const paymentSchema = z.object({ accountId: z.string().uuid(), amount: amountSchema, paymentDate: z.string().datetime({ offset: true }).optional(), note: z.string().max(500).optional() }).strict();
const idSchema = z.string().uuid();

router.use(requireAuth);

router.get("/", async (request, response) => {
  const data = await service.list(requireUserId(request));
  response.json({ success: true, data });
});

router.post("/", async (request, response) => {
  const input = createSchema.parse(request.body);
  const data = await service.create(requireUserId(request), input);
  response.status(201).json({ success: true, data });
});

router.get("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const data = await service.get(requireUserId(request), id);
  response.json({ success: true, data });
});

router.post("/:id/reminder", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const userId = requireUserId(request);
  const debt = await prisma.debt.findFirst({ where: { id, userId, remainingAmount: { gt: 0 } }, select: { id: true, personName: true, remainingAmount: true, dueDate: true } });
  if (!debt) throw new ApiError(404, "DEBT_NOT_FOUND", "The debt was not found or is already paid");
  const notification = await notificationService.create({
    userId,
    type: "DEBT",
    title: "Debt reminder",
    message: `${debt.personName}: ${debt.remainingAmount.toFixed(2)}${debt.dueDate ? `. Due ${debt.dueDate.toISOString().slice(0, 10)}` : ""}.`,
    deepLink: `/debts/${id}`,
    idempotencyKey: `manual-debt-reminder:${id}:${crypto.randomUUID()}`,
  });
  response.status(202).json({ success: true, data: notification });
});

router.patch("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = patchSchema.parse(request.body);
  if (!Object.keys(input).length) throw new ApiError(400, "EMPTY_UPDATE", "At least one debt field must be provided");
  const data = await service.update(requireUserId(request), id, input);
  response.json({ success: true, data });
});

router.delete("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  await service.delete(requireUserId(request), id);
  response.json({ success: true, data: { deleted: true } });
});

router.post("/:id/payments", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = paymentSchema.parse(request.body);
  const data = await service.pay(requireUserId(request), id, input);
  response.status(201).json({ success: true, data });
});

export { router as debtRoutes };