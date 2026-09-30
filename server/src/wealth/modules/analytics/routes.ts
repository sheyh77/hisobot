import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { DashboardService } from "../dashboard/service.js";

const router = Router();
const service = new DashboardService(prisma);
const querySchema = z.object({ period: z.enum(["week", "month", "quarter", "year"]).default("month") }).strict();

router.use(requireAuth);
router.get("/", async (request, response) => {
  const { period } = querySchema.parse(request.query);
  const data = await service.analytics(requireUserId(request), period);
  response.json({ success: true, data });
});

export { router as analyticsRoutes };