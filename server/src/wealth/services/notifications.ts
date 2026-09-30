import { NotificationType } from "@prisma/client";
import { prisma } from "../db.js";
import { PushNotificationService } from "./push-notifications.js";

const push = new PushNotificationService();

export class NotificationService {
  async create(input: { userId: string; type: NotificationType; title: string; message: string; deepLink?: string; idempotencyKey?: string }) {
    let notification;
    try {
      notification = await prisma.notification.create({ data: input });
    } catch (error) {
      if (input.idempotencyKey && error instanceof Error && "code" in error && error.code === "P2002") {
        return prisma.notification.findUniqueOrThrow({ where: { idempotencyKey: input.idempotencyKey } });
      }
      throw error;
    }
    try {
      await push.send(input.userId, input.title, input.message, input.deepLink);
    } catch (error) {
      console.error("Push notification delivery failed", error);
    }
    return notification;
  }
}