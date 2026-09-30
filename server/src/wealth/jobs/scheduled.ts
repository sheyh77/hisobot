import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { BudgetService } from "../modules/budgets/service.js";
import { NotificationService } from "../services/notifications.js";

const notifications = new NotificationService();
const budgets = new BudgetService(prisma);

export const runDailyJobs = async (now = new Date()) => {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + 3);
  await prisma.debt.updateMany({ where: { remainingAmount: { lte: 0 } }, data: { status: "PAID" } });
  await prisma.debt.updateMany({ where: { remainingAmount: { gt: 0 }, dueDate: { lt: today } }, data: { status: "OVERDUE" } });
  await prisma.debt.updateMany({ where: { remainingAmount: { gt: 0 }, paidAmount: { gt: 0 }, OR: [{ dueDate: null }, { dueDate: { gte: today } }] }, data: { status: "PARTIALLY_PAID" } });
  await prisma.debt.updateMany({ where: { remainingAmount: { gt: 0 }, paidAmount: 0, OR: [{ dueDate: null }, { dueDate: { gte: today } }] }, data: { status: "PENDING" } });

  const dueDebts = await prisma.debt.findMany({ where: { remainingAmount: { gt: 0 }, dueDate: { lte: soon } }, select: { id: true, userId: true, personName: true, remainingAmount: true, dueDate: true }, take: 5000 });
  for (const debt of dueDebts) {
    if (!debt.dueDate) continue;
    const overdue = debt.dueDate < today;
    const date = debt.dueDate.toISOString().slice(0, 10);
    await notifications.create({
      userId: debt.userId,
      type: "DEBT",
      title: overdue ? "Overdue debt" : "Debt due soon",
      message: `${debt.personName}: ${debt.remainingAmount.toFixed(2)}. Due ${date}.`,
      deepLink: `/debts/${debt.id}`,
      idempotencyKey: `debt:${debt.id}:${overdue ? "overdue" : "due-soon"}:${date}`,
    });
  }

  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  const currentBudgets = await prisma.budget.findMany({ where: { month, year }, select: { userId: true } });
  for (const budget of currentBudgets) {
    const summary = await budgets.calculate(budget.userId, month, year);
    if (summary.status === "NORMAL") continue;
    await notifications.create({
      userId: budget.userId,
      type: "BUDGET",
      title: summary.status === "EXCEEDED" ? "Budget exceeded" : "Budget warning",
      message: `Monthly budget usage is ${summary.percentage.toFixed(2)}%.`,
      deepLink: "/budgets/current",
      idempotencyKey: `budget:${budget.userId}:${year}-${month}:${summary.status}`,
    });
  }
};

export const runWeeklySummary = async (now = new Date()) => {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  const totals = await prisma.transaction.groupBy({
    by: ["userId", "type"],
    where: { deletedAt: null, transactionDate: { gte: start, lt: end }, type: { in: ["INCOME", "EXPENSE"] } },
    _sum: { amount: true },
  });
  const users = new Map<string, { income: Prisma.Decimal; expenses: Prisma.Decimal }>();
  for (const total of totals) {
    const row = users.get(total.userId) ?? { income: new Prisma.Decimal(0), expenses: new Prisma.Decimal(0) };
    if (total.type === "INCOME") row.income = total._sum.amount ?? new Prisma.Decimal(0);
    if (total.type === "EXPENSE") row.expenses = total._sum.amount ?? new Prisma.Decimal(0);
    users.set(total.userId, row);
  }
  const sunday = end.toISOString().slice(0, 10);
  for (const [userId, total] of users) {
    await notifications.create({
      userId,
      type: "INSIGHT",
      title: "Weekly financial summary",
      message: `Income: ${total.income.toFixed(2)}; expenses: ${total.expenses.toFixed(2)}; net flow: ${total.income.sub(total.expenses).toFixed(2)}.`,
      deepLink: "/analytics?period=week",
      idempotencyKey: `weekly-summary:${userId}:${sunday}`,
    });
  }
};

export const startScheduledJobs = () => {
  let lastDaily = "";
  let lastWeekly = "";
  let dailyRunning = false;
  let weeklyRunning = false;
  const tick = () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (lastDaily !== day && !dailyRunning) {
      dailyRunning = true;
      void runDailyJobs(now).then(() => { lastDaily = day; }).catch((error) => console.error("Daily job failed", error)).finally(() => { dailyRunning = false; });
    }
    if (now.getUTCDay() === 0 && lastWeekly !== day && !weeklyRunning) {
      weeklyRunning = true;
      void runWeeklySummary(now).then(() => { lastWeekly = day; }).catch((error) => console.error("Weekly summary job failed", error)).finally(() => { weeklyRunning = false; });
    }
  };
  tick();
  const timer = setInterval(tick, 60_000);
  timer.unref();
};