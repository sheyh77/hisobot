import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { DashboardService } from "./service.js";

const router = Router();
const service = new DashboardService(prisma);
const querySchema = z.object({ month: z.coerce.number().int().min(1).max(12).optional(), year: z.coerce.number().int().min(2000).max(2100).optional() }).strict();

router.use(requireAuth);
router.get("/", async (request, response) => {
  const query = querySchema.parse(request.query);
  const now = new Date();
  const data = await service.dashboard(requireUserId(request), query.month ?? now.getUTCMonth() + 1, query.year ?? now.getUTCFullYear());
  response.json({ success: true, data });
});

export { router as dashboardRoutes };