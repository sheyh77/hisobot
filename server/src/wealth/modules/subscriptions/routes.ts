import { Router } from "express";
import { prisma } from "../../db.js";
import { requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (request, response) => {
  const userId = requireUserId(request);
  const subscription = await prisma.subscription.findUnique({ where: { userId }, include: { plan: true } });
  const active = subscription?.status === "ACTIVE" && (!subscription.expiresAt || subscription.expiresAt > new Date());
  const data = active && subscription ? {
    status: subscription.status,
    startsAt: subscription.startsAt,
    expiresAt: subscription.expiresAt,
    plan: subscription.plan,
  } : {
    status: "ACTIVE",
    startsAt: null,
    expiresAt: null,
    plan: { code: "FREE", name: "Free", maxAccounts: 2, advancedInsights: false, pdfExport: false, xlsxExport: false, recurringTransactions: false, debtCollaboration: false },
  };
  response.json({ success: true, data });
});

export { router as subscriptionRoutes };