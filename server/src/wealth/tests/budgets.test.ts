import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { budgetStatusFor } from "../modules/budgets/service.js";

test("budget thresholds keep 80 and 100 percent in their specified bands", () => {
  const limit = new Prisma.Decimal("100.00");
  assert.equal(budgetStatusFor(new Prisma.Decimal("80.00"), limit), "NORMAL");
  assert.equal(budgetStatusFor(new Prisma.Decimal("80.01"), limit), "WARNING");
  assert.equal(budgetStatusFor(new Prisma.Decimal("100.00"), limit), "WARNING");
  assert.equal(budgetStatusFor(new Prisma.Decimal("100.01"), limit), "EXCEEDED");
});