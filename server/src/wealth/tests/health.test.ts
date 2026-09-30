import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { FinancialHealthService, FinancialInsightService } from "../modules/dashboard/service.js";

test("financial health score returns the configured status bands", () => {
  const service = new FinancialHealthService();
  const critical = service.score({ savingsRate: 0, budgetAdherence: 0, debtToIncomeRatio: 1, emergencyFundMonths: 0 });
  const strong = service.score({ savingsRate: 50, budgetAdherence: 100, debtToIncomeRatio: 0, emergencyFundMonths: 6 });
  assert.equal(critical.status, "Xavfli");
  assert.equal(strong.status, "A'lo darajada");
  assert.equal(strong.score, 100);
});

test("deterministic insights only describe actual directional changes", () => {
  const insights = new FinancialInsightService();
  assert.equal(insights.spendingChange(new Prisma.Decimal("70"), new Prisma.Decimal("100"), "Food"), "Food expenses decreased compared to the previous period.");
  assert.equal(insights.spendingChange(new Prisma.Decimal("100"), new Prisma.Decimal("100"), "Food"), null);
});