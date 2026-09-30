import { DevicePlatform } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const registerSchema = z.object({
  deviceId: z.string().trim().min(1).max(200),
  fcmToken: z.string().trim().min(10).max(4096),
  platform: z.enum(["android", "ios", "web"]).default("android"),
}).strict();
router.use(requireAuth);

router.post("/", async (request, response) => {
  const input = registerSchema.parse(request.body);
  const userId = requireUserId(request);
  const data = await prisma.device.upsert({
    where: { userId_deviceId: { userId, deviceId: input.deviceId } },
    create: { userId, deviceId: input.deviceId, fcmToken: input.fcmToken, platform: input.platform.toUpperCase() as DevicePlatform },
    update: { fcmToken: input.fcmToken, platform: input.platform.toUpperCase() as DevicePlatform },
    select: { id: true, deviceId: true, platform: true, createdAt: true, updatedAt: true },
  });
  response.status(201).json({ success: true, data });
});

router.delete("/:deviceId", async (request, response) => {
  const deviceId = z.string().min(1).max(200).parse(request.params.deviceId);
  const result = await prisma.device.deleteMany({ where: { deviceId, userId: requireUserId(request) } });
  response.json({ success: true, data: { deleted: result.count > 0 } });
});

export { router as deviceRoutes };