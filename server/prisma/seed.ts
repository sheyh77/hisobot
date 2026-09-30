import "dotenv/config";
import bcrypt from "bcryptjs";
import { CategoryType, Prisma, PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();
const systemCategories: Array<{ name: string; type: CategoryType }> = [
  { name: "Oziq-ovqat va bozor", type: "EXPENSE" },
  { name: "Uy va kommunal to‘lovlar", type: "EXPENSE" },
  { name: "Transport va avtomobil", type: "EXPENSE" },
  { name: "Kafe va restoranlar", type: "EXPENSE" },
  { name: "Xarid va kiyim", type: "EXPENSE" },
  { name: "Kredit & Qarz", type: "EXPENSE" },
  { name: "Boshqa xarajatlar", type: "EXPENSE" },
  { name: "Oylik maosh", type: "INCOME" },
  { name: "Biznes va Savdo", type: "INCOME" },
  { name: "Omonat foizlari", type: "INCOME" },
];

const seedProductData = async () => {
  for (const category of systemCategories) {
    const existing = await prisma.category.findFirst({ where: { userId: null, name: category.name, type: category.type } });
    if (!existing) await prisma.category.create({ data: { ...category, userId: null, isSystem: true } });
  }
  await prisma.plan.upsert({
    where: { code: "FREE" },
    create: { code: "FREE", name: "Free", maxAccounts: 2 },
    update: { name: "Free", maxAccounts: 2, advancedInsights: false, pdfExport: false, xlsxExport: false, recurringTransactions: false, debtCollaboration: false },
  });
  await prisma.plan.upsert({
    where: { code: "PRO" },
    create: { code: "PRO", name: "Pro", maxAccounts: null, advancedInsights: true, pdfExport: true, xlsxExport: true, recurringTransactions: true, debtCollaboration: true },
    update: { name: "Pro", maxAccounts: null, advancedInsights: true, pdfExport: true, xlsxExport: true, recurringTransactions: true, debtCollaboration: true },
  });
};

const seedDevelopmentDemo = async () => {
  if (process.env.SEED_DEMO_DATA !== "true") return;
  if (process.env.NODE_ENV !== "development") throw new Error("Demo data can only be seeded when NODE_ENV=development");
  const databaseHost = new URL(process.env.DATABASE_URL ?? "").hostname;
  if (databaseHost.endsWith(".render.com")) throw new Error("Demo data seeding is disabled for hosted Render databases");
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 12) throw new Error("Set DEMO_PASSWORD to at least 12 characters before running a development seed");
  const user = await prisma.user.upsert({
    where: { email: "demo@moliyam.local" },
    create: { email: "demo@moliyam.local", fullName: "Moliyam Demo", passwordHash: await bcrypt.hash(demoPassword, 12) },
    update: { fullName: "Moliyam Demo" },
  });
  let account = await prisma.account.findFirst({ where: { userId: user.id, name: "Demo cash" } });
  if (!account) account = await prisma.account.create({ data: { userId: user.id, name: "Demo cash", type: "CASH", currency: "UZS", isDefault: true } });

  const salary = await prisma.category.findFirstOrThrow({ where: { userId: null, name: "Oylik maosh", type: "INCOME" } });
  const food = await prisma.category.findFirstOrThrow({ where: { userId: null, name: "Oziq-ovqat va bozor", type: "EXPENSE" } });
  const samples: Array<{ type: TransactionType; amount: string; categoryId: string; description: string; date: Date }> = [
    { type: "INCOME", amount: "5000000.00", categoryId: salary.id, description: "Demo salary", date: new Date() },
    { type: "EXPENSE", amount: "425000.00", categoryId: food.id, description: "Demo groceries", date: new Date() },
  ];
  for (const sample of samples) {
    const existing = await prisma.transaction.findFirst({ where: { userId: user.id, accountId: account.id, description: sample.description } });
    if (existing) continue;
    const amount = new Prisma.Decimal(sample.amount);
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({ data: { userId: user.id, accountId: account.id, type: sample.type, amount, categoryId: sample.categoryId, currency: account.currency, description: sample.description, transactionDate: sample.date } });
      const delta = sample.type === "INCOME" ? amount : amount.negated();
      await tx.account.update({ where: { id: account!.id }, data: { balance: { increment: delta } } });
      await tx.ledgerEntry.create({ data: { transactionId: transaction.id, accountId: account!.id, amount: delta } });
    });
  }

  const now = new Date();
  const budget = await prisma.budget.upsert({
    where: { userId_year_month: { userId: user.id, year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 } },
    create: { userId: user.id, year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, totalLimit: "1500000.00" },
    update: {},
  });
  await prisma.budgetCategory.upsert({ where: { budgetId_categoryId: { budgetId: budget.id, categoryId: food.id } }, create: { budgetId: budget.id, categoryId: food.id, limit: "500000.00" }, update: {} });
  const existingDebt = await prisma.debt.findFirst({ where: { userId: user.id, personName: "Demo contact" } });
  if (!existingDebt) await prisma.debt.create({ data: { userId: user.id, personName: "Demo contact", type: "OWES_ME", totalAmount: "250000.00", paidAmount: "0.00", remainingAmount: "250000.00" } });
  await prisma.notification.upsert({
    where: { idempotencyKey: "development-demo-welcome" },
    create: { userId: user.id, type: "SYSTEM", title: "Welcome", message: "Development demo notification", idempotencyKey: "development-demo-welcome" },
    update: {},
  });
};

try {
  await seedProductData();
  await seedDevelopmentDemo();
} finally {
  await prisma.$disconnect();
}