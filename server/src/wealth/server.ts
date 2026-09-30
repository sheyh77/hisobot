import "dotenv/config";
import { app } from "./app.js";
import { prisma } from "./db.js";
import { startScheduledJobs } from "./jobs/scheduled.js";

const requiredSecrets = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
for (const name of requiredSecrets) {
  const value = process.env[name];
  if (!value || value.length < 32 || value.startsWith("replace_with_")) throw new Error(`${name} must contain at least 32 non-placeholder characters`);
}
if (process.env.NODE_ENV === "production") {
  for (const name of ["OTP_HMAC_SECRET", "REDIS_URL", "SMS_GATEWAY_URL", "SMS_GATEWAY_TOKEN", "FCM_PROJECT_ID", "FCM_CLIENT_EMAIL", "FCM_PRIVATE_KEY", "STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"] as const) {
    if (!process.env[name]) throw new Error(`${name} is required in production`);
  }
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) throw new Error("JWT access and refresh secrets must be different");
  if ((process.env.OTP_HMAC_SECRET?.length ?? 0) < 32) throw new Error("OTP_HMAC_SECRET must contain at least 32 characters");
  if (!process.env.SMS_GATEWAY_URL?.startsWith("https://") || !process.env.STORAGE_ENDPOINT?.startsWith("https://")) throw new Error("SMS_GATEWAY_URL and STORAGE_ENDPOINT must use HTTPS in production");
  if (!process.env.FCM_CLIENT_EMAIL?.endsWith(".iam.gserviceaccount.com") || !process.env.FCM_PRIVATE_KEY?.includes("-----END PRIVATE KEY-----")) throw new Error("FCM service account credentials are invalid");
}

const port = Number(process.env.WEALTH_PORT ?? process.env.PORT ?? 5001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("WEALTH_PORT must be a valid TCP port");
const server = app.listen(port, () => console.log(`Moliyam Wealth API listening on ${port}`));
startScheduledJobs();

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);