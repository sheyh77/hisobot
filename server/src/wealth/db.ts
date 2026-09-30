import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & { wealthPrisma?: PrismaClient };

export const prisma = globalForPrisma.wealthPrisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.wealthPrisma = prisma;