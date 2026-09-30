import admin from "firebase-admin";
import { prisma } from "../db.js";

const firebaseConfig = {
  projectId: process.env.FCM_PROJECT_ID,
  clientEmail: process.env.FCM_CLIENT_EMAIL,
  privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};
const ready = Boolean(firebaseConfig.projectId?.trim() && firebaseConfig.clientEmail?.endsWith(".iam.gserviceaccount.com") && firebaseConfig.privateKey?.includes("-----BEGIN PRIVATE KEY-----") && firebaseConfig.privateKey.includes("-----END PRIVATE KEY-----") && !firebaseConfig.privateKey.includes("..."));
if (ready && !admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount) });

export class PushNotificationService {
  async send(userId: string, title: string, message: string, deepLink?: string | null) {
    if (!ready) return;
    const devices = await prisma.device.findMany({ where: { userId }, select: { id: true, fcmToken: true } });
    for (let offset = 0; offset < devices.length; offset += 500) {
      const batch = devices.slice(offset, offset + 500);
      const result = await admin.messaging().sendEachForMulticast({
        tokens: batch.map(({ fcmToken }) => fcmToken),
        notification: { title, body: message },
        data: deepLink ? { deepLink } : undefined,
        android: { priority: "high", notification: { channelId: "moliyam-reminders", sound: "default" } },
      });
      const stale = result.responses.flatMap((item, index) => item.success || !["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(item.error?.code ?? "") ? [] : [batch[index]!.id]);
      if (stale.length) await prisma.device.deleteMany({ where: { id: { in: stale }, userId } });
    }
  }
}