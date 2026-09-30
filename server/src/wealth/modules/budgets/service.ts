import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../errors.js";

const monthRange = (month: number, year: number) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});

const statusFor = (spent: Prisma.Decimal, limit: Prisma.Decimal) => {
  if (spent.gt(limit)) return "EXCEEDED" as const;
  if (spent.mul(100).gt(limit.mul(80))) return "WARNING" as const;
  return "NORMAL" as const;
};

export class BudgetService {
  constructor(private readonly db: PrismaClient) {}

  async calculate(userId: string, month: number, year: number) {
    const { start, end } = monthRange(month, year);
    const budget = await this.db.budget.findUnique({ where: { userId_year_month: { userId, year, month } }, include: { categories: { include: { category: { select: { id: true, name: true, icon: true, color: true } } } } } });
    const filter = { userId, type: "EXPENSE" as const, deletedAt: null, transactionDate: { gte: start, lt: end } };
    const [total, byCategory] = await Promise.all([
      this.db.transaction.aggregate({ where: filter, _sum: { amount: true } }),
      this.db.transaction.groupBy({ by: ["categoryId"], where: filter, _sum: { amount: true } }),
    ]);
    const spent = total._sum.amount ?? new Prisma.Decimal(0);
    const totalLimit = budget?.totalLimit ?? new Prisma.Decimal(0);
    const categoryTotals = new Map(byCategory.map((item) => [item.categoryId, item._sum.amount ?? new Prisma.Decimal(0)]));
    const categories = budget?.categories.map((item) => {
      const categorySpent = categoryTotals.get(item.categoryId) ?? new Prisma.Decimal(0);
      return {
        category: item.category,
        limit: item.limit.toFixed(2),
        spent: categorySpent.toFixed(2),
        remaining: item.limit.sub(categorySpent).toFixed(2),
        percentage: item.limit.isZero() ? 0 : Number(categorySpent.mul(100).div(item.limit).toFixed(2)),
        status: statusFor(categorySpent, item.limit),
      };
    }) ?? [];
    return {
      id: budget?.id ?? null,
      month,
      year,
      totalLimit: totalLimit.toFixed(2),
      spent: spent.toFixed(2),
      remaining: totalLimit.sub(spent).toFixed(2),
      percentage: totalLimit.isZero() ? 0 : Number(spent.mul(100).div(totalLimit).toFixed(2)),
      status: statusFor(spent, totalLimit),
      categories,
    };
  }

  async validateCategories(userId: string, categoryIds: string[]) {
    if (!categoryIds.length) return;
    const uniqueIds = [...new Set(categoryIds)];
    const count = await this.db.category.count({ where: { id: { in: uniqueIds }, type: "EXPENSE", OR: [{ userId: null }, { userId }] } });
    if (count !== uniqueIds.length) throw new ApiError(422, "INVALID_BUDGET_CATEGORY", "Every budget category must be an available expense category");
  }
}

export { statusFor as budgetStatusFor };