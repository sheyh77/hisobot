import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { calculateTransactionDeltas, parsePositiveAmount } from "../modules/transactions/service.js";

test("income and expense ledger entries have exact signed Decimal amounts", () => {
  const amount = parsePositiveAmount("123456789.12");
  assert.equal(calculateTransactionDeltas("INCOME", "account-a", null, amount).get("account-a")?.toFixed(2), "123456789.12");
  assert.equal(calculateTransactionDeltas("EXPENSE", "account-a", null, amount).get("account-a")?.toFixed(2), "-123456789.12");
});

test("transfer is represented as balanced source and destination ledger entries", () => {
  const entries = calculateTransactionDeltas("TRANSFER", "source", "destination", new Prisma.Decimal("450.25"));
  assert.equal(entries.get("source")?.toFixed(2), "-450.25");
  assert.equal(entries.get("destination")?.toFixed(2), "450.25");
  assert.equal([...entries.values()].reduce((sum, amount) => sum.add(amount), new Prisma.Decimal(0)).toFixed(2), "0.00");
});

test("financial amounts reject zero, excess precision, and non-decimal input", () => {
  assert.throws(() => parsePositiveAmount("0"));
  assert.throws(() => parsePositiveAmount("1.001"));
  assert.throws(() => parsePositiveAmount("1e4"));
  assert.throws(() => parsePositiveAmount("10000000000000000.00"));
});