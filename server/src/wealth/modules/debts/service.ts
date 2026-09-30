import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../errors.js";

const money = (value: string) => {
  const amount = new Prisma.Decimal(value);
  if (!amount.isFinite() || amount.lte(0) || amount.decimalPlaces() > 2 || amount.gt("9999999999999999.99")) throw new ApiError(422, "INVALID_AMOUNT", "Amount must be positive and have no more than two decimal places");
  return amount;
};

const calculatedStatus = (remaining: Prisma.Decimal, paid: Prisma.Decimal, dueDate: Date | null) => {
  if (remaining.lte(0)) return "PAID" as const;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (dueDate && dueDate < today) return "OVERDUE" as const;
  if (paid.gt(0)) return "PARTIALLY_PAID" as const;
  return "PENDING" as const;
};

export type CreateDebtInput = {
  personName: string;
  phone?: string;
  relationship?: string;
  type: "OWES_ME" | "I_OWE";
  totalAmount: string;
  dueDate?: string | null;
  notes?: string;
};

export class DebtService {
  constructor(private readonly db: PrismaClient) {}

  private withStatus<T extends { remainingAmount: Prisma.Decimal; paidAmount: Prisma.Decimal; dueDate: Date | null }>(debt: T) {
    return { ...debt, status: calculatedStatus(debt.remainingAmount, debt.paidAmount, debt.dueDate) };
  }

  async list(userId: string) {
    const debts = await this.db.debt.findMany({ where: { userId }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] });
    return debts.map((debt) => this.withStatus(debt));
  }

  async get(userId: string, id: string) {
    const debt = await this.db.debt.findFirst({ where: { id, userId }, include: { payments: { orderBy: { paymentDate: "desc" }, include: { account: { select: { id: true, name: true } } } } } });
    if (!debt) throw new ApiError(404, "DEBT_NOT_FOUND", "The debt was not found");
    return this.withStatus(debt);
  }

  async create(userId: string, input: CreateDebtInput) {
    const totalAmount = money(input.totalAmount);
    const dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null;
    const debt = await this.db.debt.create({ data: {
      userId,
      personName: input.personName.trim(),
      phone: input.phone,
      relationship: input.relationship,
      type: input.type,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      dueDate,
      notes: input.notes,
    } });
    return this.withStatus(debt);
  }

  async update(userId: string, id: string, input: Partial<Omit<CreateDebtInput, "type">>) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM wealth_debts WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`);
      const current = await tx.debt.findFirst({ where: { id, userId } });
      if (!current) throw new ApiError(404, "DEBT_NOT_FOUND", "The debt was not found");
      const totalAmount = input.totalAmount === undefined ? current.totalAmount : money(input.totalAmount);
      const remainingAmount = totalAmount.sub(current.paidAmount);
      if (remainingAmount.lt(0)) throw new ApiError(422, "TOTAL_BELOW_PAID", "Total amount cannot be less than the amount already paid");
      const dueDate = input.dueDate === undefined ? current.dueDate : input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null;
      const debt = await tx.debt.update({ where: { id }, data: {
        ...(input.personName === undefined ? {} : { personName: input.personName.trim() }),
        ...(input.phone === undefined ? {} : { phone: input.phone }),
        ...(input.relationship === undefined ? {} : { relationship: input.relationship }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
        totalAmount,
        remainingAmount,
        status: calculatedStatus(remainingAmount, current.paidAmount, dueDate),
        dueDate,
      } });
      return this.withStatus(debt);
    }, { isolationLevel: "Serializable" });
  }

  async delete(userId: string, id: string) {
    try {
      const deleted = await this.db.debt.deleteMany({ where: { id, userId } });
      if (!deleted.count) throw new ApiError(404, "DEBT_NOT_FOUND", "The debt was not found");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && "code" in error && error.code === "P2003") throw new ApiError(409, "DEBT_HAS_PAYMENTS", "Debts with payment history cannot be deleted");
      throw error;
    }
  }

  async pay(userId: string, debtId: string, input: { accountId: string; amount: string; paymentDate?: string; note?: string }) {
    const amount = money(input.amount);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM wealth_debts WHERE id = ${debtId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`);
      const debt = await tx.debt.findFirst({ where: { id: debtId, userId } });
      if (!debt) throw new ApiError(404, "DEBT_NOT_FOUND", "The debt was not found");
      if (amount.gt(debt.remainingAmount)) throw new ApiError(422, "PAYMENT_EXCEEDS_REMAINING", "Payment cannot exceed the remaining debt amount");

      const accounts = await tx.$queryRaw<Array<{ id: string; balance: Prisma.Decimal; currency: string }>>(Prisma.sql`
        SELECT id, balance, currency FROM wealth_accounts
        WHERE id = ${input.accountId}::uuid AND user_id = ${userId}::uuid
        FOR UPDATE
      `);
      const account = accounts[0];
      if (!account) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "The account was not found");
      const isIncome = debt.type === "OWES_ME";
      const balanceDelta = isIncome ? amount : amount.negated();
      const newBalance = account.balance.add(balanceDelta);
      if (newBalance.lt(0)) throw new ApiError(422, "INSUFFICIENT_BALANCE", "The account does not have enough available balance");
      const newPaidAmount = debt.paidAmount.add(amount);
      const newRemainingAmount = debt.remainingAmount.sub(amount);
      const type = isIncome ? "INCOME" : "EXPENSE";
      const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
      const transaction = await tx.transaction.create({ data: {
        userId,
        accountId: account.id,
        type,
        amount,
        currency: account.currency,
        description: `Debt payment: ${debt.personName}`.slice(0, 500),
        transactionDate: paymentDate,
      } });
      await tx.account.update({ where: { id: account.id }, data: { balance: newBalance } });
      await tx.ledgerEntry.create({ data: { transactionId: transaction.id, accountId: account.id, amount: balanceDelta } });
      const payment = await tx.debtPayment.create({ data: {
        debtId,
        userId,
        accountId: account.id,
        amount,
        paymentDate,
        note: input.note,
        transactionId: transaction.id,
      } });
      const status = calculatedStatus(newRemainingAmount, newPaidAmount, debt.dueDate);
      const updatedDebt = await tx.debt.update({ where: { id: debtId }, data: { paidAmount: newPaidAmount, remainingAmount: newRemainingAmount, status } });
      return { payment, transaction, debt: this.withStatus(updatedDebt) };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 });
  }
}