import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const idSchema = z.string().uuid();
const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(30) }).strict();
router.use(requireAuth);

router.get("/", async (request, response) => {
  const { page, limit } = querySchema.parse(request.query);
  const userId = requireUserId(request);
  const where = { userId };
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  response.json({ success: true, data: { items, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

router.patch("/:id/read", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const userId = requireUserId(request);
  const updated = await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  if (!updated.count) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "The notification was not found");
  const data = await prisma.notification.findUniqueOrThrow({ where: { id } });
  response.json({ success: true, data });
});

router.post("/read-all", async (request, response) => {
  const result = await prisma.notification.updateMany({ where: { userId: requireUserId(request), isRead: false }, data: { isRead: true } });
  response.json({ success: true, data: { updatedCount: result.count } });
});

router.delete("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const deleted = await prisma.notification.deleteMany({ where: { id, userId: requireUserId(request) } });
  if (!deleted.count) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "The notification was not found");
  response.json({ success: true, data: { deleted: true } });
});

export { router as notificationRoutes };