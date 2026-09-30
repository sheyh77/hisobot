import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { BudgetService } from "../budgets/service.js";

type Period = "week" | "month" | "quarter" | "year";
const decimal = (value: Prisma.Decimal | null | undefined) => value ?? new Prisma.Decimal(0);
const growth = (current: Prisma.Decimal, previous: Prisma.Decimal) => previous.isZero() ? null : Number(current.sub(previous).mul(100).div(previous.abs()).toFixed(2));

const periodRange = (period: Period, now: Date) => {
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "week") start.setUTCDate(start.getUTCDate() - 6);
  if (period === "month") start.setUTCDate(1);
  if (period === "quarter") start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3, 1);
  if (period === "year") start.setUTCMonth(0, 1);
  const duration = end.getTime() - start.getTime();
  return { start, end, previousStart: new Date(start.getTime() - duration - 1), previousEnd: new Date(start.getTime() - 1) };
};

export class FinancialHealthService {
  private readonly weights = {
    savings: Number(process.env.HEALTH_WEIGHT_SAVINGS ?? 0.3),
    budget: Number(process.env.HEALTH_WEIGHT_BUDGET ?? 0.3),
    debt: Number(process.env.HEALTH_WEIGHT_DEBT ?? 0.2),
    emergency: Number(process.env.HEALTH_WEIGHT_EMERGENCY ?? 0.2),
  };

  score(metrics: { savingsRate: number; budgetAdherence: number; debtToIncomeRatio: number; emergencyFundMonths: number }) {
    const validWeight = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;
    const weightTotal = Object.values(this.weights).reduce((sum, value) => sum + validWeight(value), 0);
    const scores = {
      savings: Math.max(0, Math.min(100, metrics.savingsRate * 2)),
      budget: Math.max(0, Math.min(100, metrics.budgetAdherence)),
      debt: Math.max(0, Math.min(100, 100 - metrics.debtToIncomeRatio * 100)),
      emergency: Math.max(0, Math.min(100, metrics.emergencyFundMonths / 6 * 100)),
    };
    const weighted = weightTotal === 0 ? 0 : Object.entries(scores).reduce((sum, [key, score]) => sum + score * validWeight(this.weights[key as keyof typeof this.weights]), 0) / weightTotal;
    const score = Math.round(weighted);
    const status = score >= 80 ? "A'lo darajada" : score >= 60 ? "Yaxshi" : score >= 40 ? "O‘rtacha" : "Xavfli";
    return { score, status, metrics, explanation: "This score summarizes recorded financial activity and is not certified financial advice." };
  }
}

export class FinancialInsightService {
  spendingChange(current: Prisma.Decimal, previous: Prisma.Decimal, label: string) {
    if (previous.isZero() || current.equals(previous)) return null;
    const direction = current.lt(previous) ? "decreased" : "increased";
    return `${label} expenses ${direction} compared to the previous period.`;
  }

  incomeChange(current: Prisma.Decimal, previous: Prisma.Decimal) {
    if (previous.isZero() || current.equals(previous)) return null;
    return `Income ${current.lt(previous) ? "decreased" : "increased"} compared to the previous period.`;
  }
}

export class DashboardService {
  private readonly budgets: BudgetService;
  private readonly health = new FinancialHealthService();
  private readonly insights = new FinancialInsightService();

  constructor(private readonly db: PrismaClient) {
    this.budgets = new BudgetService(db);
  }

  async dashboard(userId: string, month: number, year: number) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, select: { currency: true } });
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const previousStart = new Date(Date.UTC(year, month - 2, 1));
    const [accounts, current, previous, recent, unreadCount, debtAgg, previousBalance, budget, subscription] = await Promise.all([
      this.db.account.aggregate({ where: { userId, currency: user.currency }, _sum: { balance: true } }),
      this.db.transaction.groupBy({ by: ["type"], where: { userId, deletedAt: null, transactionDate: { gte: start, lt: end }, type: { in: ["INCOME", "EXPENSE"] } }, _sum: { amount: true } }),
      this.db.transaction.groupBy({ by: ["type"], where: { userId, deletedAt: null, transactionDate: { gte: previousStart, lt: start }, type: { in: ["INCOME", "EXPENSE"] } }, _sum: { amount: true } }),
      this.db.transaction.findMany({ where: { userId, deletedAt: null }, orderBy: { transactionDate: "desc" }, take: 4, include: { category: { select: { id: true, name: true, icon: true, color: true } }, account: { select: { id: true, name: true } }, toAccount: { select: { id: true, name: true } } } }),
      this.db.notification.count({ where: { userId, isRead: false } }),
      this.db.debt.aggregate({ where: { userId, remainingAmount: { gt: 0 } }, _sum: { remainingAmount: true }, _count: { _all: true } }),
      this.balanceAt(userId, user.currency, start),
      this.budgets.calculate(userId, month, year),
      this.db.subscription.findUnique({ where: { userId }, include: { plan: { select: { advancedInsights: true } } } }),
    ]);
    const currentIncome = decimal(current.find((item) => item.type === "INCOME")?._sum.amount);
    const currentExpenses = decimal(current.find((item) => item.type === "EXPENSE")?._sum.amount);
    const previousIncome = decimal(previous.find((item) => item.type === "INCOME")?._sum.amount);
    const previousExpenses = decimal(previous.find((item) => item.type === "EXPENSE")?._sum.amount);
    const totalBalance = decimal(accounts._sum.balance);
    const priorBalance = decimal(previousBalance);
    const debtRows = await this.db.debt.findMany({ where: { userId, remainingAmount: { gt: 0 } }, select: { dueDate: true, type: true, remainingAmount: true } });
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const overdue = debtRows.filter((debt) => debt.dueDate && debt.dueDate < today);
    const savings = currentIncome.sub(currentExpenses);
    const health = this.health.score({
      savingsRate: currentIncome.isZero() ? 0 : Number(savings.mul(100).div(currentIncome).toFixed(2)),
      budgetAdherence: budget.totalLimit === "0.00" ? 0 : Math.max(0, 100 - budget.percentage),
      debtToIncomeRatio: currentIncome.isZero() ? 0 : Number(decimal(debtAgg._sum.remainingAmount).div(currentIncome).toFixed(4)),
      emergencyFundMonths: currentExpenses.isZero() ? 0 : Number(totalBalance.div(currentExpenses).toFixed(2)),
    });
    const advancedInsightsEnabled = subscription?.status === "ACTIVE" && (!subscription.expiresAt || subscription.expiresAt > new Date()) && subscription.plan.advancedInsights;
    return {
      currency: user.currency,
      totalBalance: totalBalance.toFixed(2),
      previousBalance: priorBalance.toFixed(2),
      balanceGrowth: growth(totalBalance, priorBalance),
      monthlyIncome: currentIncome.toFixed(2),
      monthlyExpenses: currentExpenses.toFixed(2),
      incomeGrowth: growth(currentIncome, previousIncome),
      expenseGrowth: growth(currentExpenses, previousExpenses),
      currentBudget: budget,
      budgetPercentage: budget.percentage,
      remainingBudget: budget.remaining,
      recentTransactions: recent,
      unreadNotificationCount: unreadCount,
      debtSummary: { count: debtAgg._count._all, remaining: decimal(debtAgg._sum.remainingAmount).toFixed(2), overdueCount: overdue.length },
      financialHealth: health,
      insights: advancedInsightsEnabled ? [this.insights.incomeChange(currentIncome, previousIncome), this.insights.spendingChange(currentExpenses, previousExpenses, "Total")].filter(Boolean) : [],
    };
  }

  async analytics(userId: string, period: Period) {
    const now = new Date();
    const { start, end, previousStart, previousEnd } = periodRange(period, now);
    const [current, previous, categories, previousCategories, transactions] = await Promise.all([
      this.db.transaction.groupBy({ by: ["type"], where: { userId, deletedAt: null, transactionDate: { gte: start, lte: end }, type: { in: ["INCOME", "EXPENSE"] } }, _sum: { amount: true } }),
      this.db.transaction.groupBy({ by: ["type"], where: { userId, deletedAt: null, transactionDate: { gte: previousStart, lte: previousEnd }, type: { in: ["INCOME", "EXPENSE"] } }, _sum: { amount: true } }),
      this.db.transaction.groupBy({ by: ["categoryId"], where: { userId, type: "EXPENSE", deletedAt: null, transactionDate: { gte: start, lte: end } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } } }),
      this.db.transaction.groupBy({ by: ["categoryId"], where: { userId, type: "EXPENSE", deletedAt: null, transactionDate: { gte: previousStart, lte: previousEnd } }, _sum: { amount: true } }),
      this.db.transaction.findMany({ where: { userId, type: "EXPENSE", deletedAt: null, transactionDate: { gte: start, lte: end } }, select: { amount: true, transactionDate: true }, take: 10_000 }),
    ]);
    const income = decimal(current.find((item) => item.type === "INCOME")?._sum.amount);
    const expenses = decimal(current.find((item) => item.type === "EXPENSE")?._sum.amount);
    const previousIncome = decimal(previous.find((item) => item.type === "INCOME")?._sum.amount);
    const previousExpenses = decimal(previous.find((item) => item.type === "EXPENSE")?._sum.amount);
    const categoryIds = categories.flatMap((item) => item.categoryId ? [item.categoryId] : []);
    const categoryNames = await this.db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true, icon: true, color: true } });
    const categoryMap = new Map(categoryNames.map((item) => [item.id, item]));
    const categoryBreakdown = categories.map((item) => ({ category: item.categoryId ? categoryMap.get(item.categoryId) ?? null : null, amount: decimal(item._sum.amount).toFixed(2) }));
    const weekly = new Map<string, Prisma.Decimal>();
    for (const transaction of transactions) {
      const weekStart = new Date(transaction.transactionDate);
      weekStart.setUTCHours(0, 0, 0, 0);
      weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
      const key = weekStart.toISOString().slice(0, 10);
      weekly.set(key, (weekly.get(key) ?? new Prisma.Decimal(0)).add(transaction.amount));
    }
    const savings = income.sub(expenses);
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, select: { currency: true } });
    const [currentBudget, sixMonthExpenses, accountBalances, outstandingDebt] = await Promise.all([
      this.budgets.calculate(userId, now.getUTCMonth() + 1, now.getUTCFullYear()),
      this.db.transaction.aggregate({ where: { userId, type: "EXPENSE", deletedAt: null, transactionDate: { gte: sixMonthsAgo } }, _sum: { amount: true } }),
      this.db.account.aggregate({ where: { userId, currency: user.currency }, _sum: { balance: true } }),
      this.db.debt.aggregate({ where: { userId, remainingAmount: { gt: 0 } }, _sum: { remainingAmount: true } }),
    ]);
    const averageMonthlyExpenses = decimal(sixMonthExpenses._sum.amount).div(6);
    const health = this.health.score({
      savingsRate: income.isZero() ? 0 : Number(savings.mul(100).div(income).toFixed(2)),
      budgetAdherence: currentBudget.totalLimit === "0.00" ? 0 : Math.max(0, 100 - currentBudget.percentage),
      debtToIncomeRatio: income.isZero() ? 0 : Number(decimal(outstandingDebt._sum.remainingAmount).div(income).toFixed(4)),
      emergencyFundMonths: averageMonthlyExpenses.isZero() ? 0 : Number(decimal(accountBalances._sum.balance).div(averageMonthlyExpenses).toFixed(2)),
    });
    const previousByCategory = new Map(previousCategories.map((item) => [item.categoryId, item._sum.amount]));
    const insights = [
      this.insights.incomeChange(income, previousIncome),
      this.insights.spendingChange(expenses, previousExpenses, "Total"),
      ...categories.flatMap(({ categoryId, _sum }) => {
        const previousCategory = previousByCategory.get(categoryId);
        const categoryName = categoryId ? categoryMap.get(categoryId)?.name ?? "Uncategorized" : "Uncategorized";
        return previousCategory ? [this.insights.spendingChange(decimal(_sum.amount), previousCategory, categoryName)] : [];
      }),
    ].filter(Boolean);
    const subscription = await this.db.subscription.findUnique({ where: { userId }, include: { plan: { select: { advancedInsights: true } } } });
    const advancedInsightsEnabled = subscription?.status === "ACTIVE" && (!subscription.expiresAt || subscription.expiresAt > new Date()) && subscription.plan.advancedInsights;
    return {
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      netFlow: savings.toFixed(2),
      growth: { income: growth(income, previousIncome), expenses: growth(expenses, previousExpenses) },
      weeklySpending: [...weekly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, amount]) => ({ weekStart, amount: amount.toFixed(2) })),
      categoryBreakdown,
      financialHealth: health,
      insights: advancedInsightsEnabled ? insights : [],
    };
  }

  private async balanceAt(userId: string, currency: string, before: Date) {
    const rows = await this.db.$queryRaw<Array<{ balance: Prisma.Decimal }>>(Prisma.sql`
      SELECT COALESCE(SUM(CASE
        WHEN "type" = 'INCOME' AND account_id IN (SELECT id FROM wealth_accounts WHERE user_id = ${userId}::uuid AND currency = ${currency}) THEN amount
        WHEN "type" = 'EXPENSE' AND account_id IN (SELECT id FROM wealth_accounts WHERE user_id = ${userId}::uuid AND currency = ${currency}) THEN -amount
        WHEN "type" = 'TRANSFER' AND account_id IN (SELECT id FROM wealth_accounts WHERE user_id = ${userId}::uuid AND currency = ${currency}) THEN -amount
        WHEN "type" = 'TRANSFER' AND to_account_id IN (SELECT id FROM wealth_accounts WHERE user_id = ${userId}::uuid AND currency = ${currency}) THEN amount
        ELSE 0 END), 0)::numeric AS balance
      FROM wealth_transactions
      WHERE user_id = ${userId}::uuid AND deleted_at IS NULL AND transaction_date < ${before}
    `);
    return rows[0]?.balance ?? new Prisma.Decimal(0);
  }
}