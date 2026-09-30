import { Prisma, TransactionType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "../../errors.js";

type Db = PrismaClient | Prisma.TransactionClient;
type TransactionInput = {
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amount: string;
  currency?: string;
  description?: string;
  transactionDate?: string;
  receiptUrl?: string | null;
};
type ListOptions = {
  page: number;
  limit: number;
  search?: string;
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort: "asc" | "desc";
};
type LockedAccount = { id: string; balance: Prisma.Decimal; currency: string };

export const parsePositiveAmount = (value: string): Prisma.Decimal => {
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(value)) throw new ApiError(422, "INVALID_AMOUNT", "Amount must be a positive decimal string with no more than two decimal places");
  const amount = new Prisma.Decimal(value);
  if (!amount.isFinite() || amount.lte(0) || amount.decimalPlaces() > 2 || amount.greaterThan("9999999999999999.99")) {
    throw new ApiError(422, "INVALID_AMOUNT", "Amount must be positive and have no more than two decimal places");
  }
  return amount;
};

const lockAccounts = async (tx: Prisma.TransactionClient, userId: string, ids: string[]): Promise<Map<string, LockedAccount>> => {
  const uniqueIds = [...new Set(ids)].sort();
  if (!uniqueIds.length) throw new ApiError(422, "ACCOUNT_REQUIRED", "At least one account is required");
  const idSql = Prisma.join(uniqueIds.map((id) => Prisma.sql`${id}::uuid`));
  const rows = await tx.$queryRaw<LockedAccount[]>(Prisma.sql`
    SELECT id, balance, currency
    FROM wealth_accounts
    WHERE user_id = ${userId}::uuid AND id IN (${idSql})
    ORDER BY id
    FOR UPDATE
  `);
  if (rows.length !== uniqueIds.length) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "One or more accounts were not found");
  return new Map(rows.map((row) => [row.id, row]));
};

const normalizedInput = (input: TransactionInput) => {
  if (input.type === "TRANSFER") {
    if (!input.toAccountId || input.toAccountId === input.accountId) throw new ApiError(422, "INVALID_TRANSFER", "A transfer requires two different accounts");
    if (input.categoryId) throw new ApiError(422, "INVALID_TRANSFER", "Transfers cannot have an income or expense category");
  } else if (input.toAccountId) {
    throw new ApiError(422, "INVALID_TRANSFER", "Only transfers can have a destination account");
  }
  return parsePositiveAmount(input.amount);
};

const validateCategory = async (tx: Prisma.TransactionClient, userId: string, categoryId: string | null | undefined, type: TransactionType) => {
  if (type === "TRANSFER") return;
  if (!categoryId) throw new ApiError(422, "CATEGORY_REQUIRED", "Income and expense transactions require a category");
  const categoryType = type === "INCOME" ? "INCOME" : "EXPENSE";
  const category = await tx.category.findFirst({
    where: { id: categoryId, type: categoryType, OR: [{ userId: null }, { userId }] },
    select: { id: true },
  });
  if (!category) throw new ApiError(404, "CATEGORY_NOT_FOUND", "The category was not found");
};

const deltasFor = (input: TransactionInput, amount: Prisma.Decimal): Map<string, Prisma.Decimal> => {
  const deltas = new Map<string, Prisma.Decimal>();
  if (input.type === "INCOME") deltas.set(input.accountId, amount);
  else if (input.type === "EXPENSE") deltas.set(input.accountId, amount.negated());
  else {
    deltas.set(input.accountId, amount.negated());
    deltas.set(input.toAccountId!, amount);
  }
  return deltas;
};

export const calculateTransactionDeltas = (type: TransactionType, accountId: string, toAccountId: string | null, amount: Prisma.Decimal) =>
  deltasFor({ accountId, toAccountId, type, amount: amount.toFixed(2) }, amount);

const addLedgerEntries = async (tx: Prisma.TransactionClient, transactionId: string, deltas: Map<string, Prisma.Decimal>) => {
  const entries = [...deltas.entries()].filter(([, amount]) => !amount.isZero()).map(([accountId, amount]) => ({ transactionId, accountId, amount }));
  if (entries.length) await tx.ledgerEntry.createMany({ data: entries });
};

const retrySerializable = async <T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 15_000 });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 15 + Math.floor(Math.random() * 35)));
    }
  }
};

const assertCurrencyAndBalance = (accounts: Map<string, LockedAccount>, input: TransactionInput, deltas: Map<string, Prisma.Decimal>, baseBalances?: Map<string, Prisma.Decimal>) => {
  const source = accounts.get(input.accountId)!;
  const destination = input.toAccountId ? accounts.get(input.toAccountId)! : undefined;
  if (destination && destination.currency !== source.currency) throw new ApiError(422, "CURRENCY_MISMATCH", "Transfers require accounts with the same currency");
  if (input.currency && input.currency !== source.currency) throw new ApiError(422, "CURRENCY_MISMATCH", "Transaction currency must match its account");
  for (const [accountId, delta] of deltas) {
    const balance = baseBalances?.get(accountId) ?? accounts.get(accountId)!.balance;
    if (balance.add(delta).lt(0)) throw new ApiError(422, "INSUFFICIENT_BALANCE", "The account does not have enough available balance");
  }
};

export class TransactionService {
  constructor(private readonly db: PrismaClient) {}

  async create(userId: string, input: TransactionInput) {
    const amount = normalizedInput(input);
    return retrySerializable(this.db, async (tx) => {
      await validateCategory(tx, userId, input.categoryId, input.type);
      const accountIds = [input.accountId, ...(input.toAccountId ? [input.toAccountId] : [])];
      const accounts = await lockAccounts(tx, userId, accountIds);
      const deltas = deltasFor(input, amount);
      assertCurrencyAndBalance(accounts, input, deltas);
      const transaction = await tx.transaction.create({ data: {
        userId,
        accountId: input.accountId,
        toAccountId: input.toAccountId ?? null,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amount,
        currency: accounts.get(input.accountId)!.currency,
        description: input.description?.trim() ?? "",
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
        receiptUrl: input.receiptUrl ?? null,
      } });
      for (const [accountId, delta] of deltas) {
        await tx.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } });
      }
      await addLedgerEntries(tx, transaction.id, deltas);
      return transaction;
    });
  }

  async update(userId: string, transactionId: string, patch: Partial<TransactionInput>) {
    return retrySerializable(this.db, async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM wealth_transactions WHERE id = ${transactionId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`);
      const current = await tx.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null }, include: { ledgerEntries: true, debtPayment: { select: { id: true } } } });
      if (!current) throw new ApiError(404, "TRANSACTION_NOT_FOUND", "The transaction was not found");
      if (current.debtPayment) throw new ApiError(409, "DEBT_PAYMENT_TRANSACTION", "Debt payment transactions can only be changed through the debt payment workflow");
      const input: TransactionInput = {
        accountId: patch.accountId ?? current.accountId,
        toAccountId: patch.toAccountId === undefined ? current.toAccountId : patch.toAccountId,
        categoryId: patch.categoryId === undefined ? current.categoryId : patch.categoryId,
        type: patch.type ?? current.type,
        amount: patch.amount ?? current.amount.toFixed(2),
        currency: patch.currency ?? current.currency,
        description: patch.description ?? current.description,
        transactionDate: patch.transactionDate ?? current.transactionDate.toISOString(),
        receiptUrl: patch.receiptUrl === undefined ? current.receiptUrl : patch.receiptUrl,
      };
      const amount = normalizedInput(input);
      await validateCategory(tx, userId, input.categoryId, input.type);
      const oldEffect = new Map<string, Prisma.Decimal>();
      for (const entry of current.ledgerEntries) oldEffect.set(entry.accountId, (oldEffect.get(entry.accountId) ?? new Prisma.Decimal(0)).add(entry.amount));
      const newEffect = deltasFor(input, amount);
      const accountIds = [...oldEffect.keys(), ...newEffect.keys()];
      const accounts = await lockAccounts(tx, userId, accountIds);
      const baseBalances = new Map<string, Prisma.Decimal>();
      for (const [accountId, account] of accounts) baseBalances.set(accountId, account.balance.sub(oldEffect.get(accountId) ?? 0));
      assertCurrencyAndBalance(accounts, input, newEffect, baseBalances);
      for (const [accountId, account] of accounts) {
        const finalBalance = baseBalances.get(accountId)!.add(newEffect.get(accountId) ?? 0);
        await tx.account.update({ where: { id: accountId }, data: { balance: finalBalance } });
      }
      const reversal = new Map([...oldEffect].map(([accountId, delta]) => [accountId, delta.negated()]));
      await addLedgerEntries(tx, current.id, reversal);
      const updated = await tx.transaction.update({ where: { id: current.id }, data: {
        accountId: input.accountId,
        toAccountId: input.toAccountId ?? null,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amount,
        currency: accounts.get(input.accountId)!.currency,
        description: input.description?.trim() ?? "",
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : current.transactionDate,
        receiptUrl: input.receiptUrl ?? null,
      } });
      await addLedgerEntries(tx, updated.id, newEffect);
      return updated;
    });
  }

  async delete(userId: string, transactionId: string) {
    return retrySerializable(this.db, async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM wealth_transactions WHERE id = ${transactionId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`);
      const current = await tx.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null }, include: { ledgerEntries: true, debtPayment: { select: { id: true } } } });
      if (!current) throw new ApiError(404, "TRANSACTION_NOT_FOUND", "The transaction was not found");
      if (current.debtPayment) throw new ApiError(409, "DEBT_PAYMENT_TRANSACTION", "Debt payment transactions can only be changed through the debt payment workflow");
      const effect = new Map<string, Prisma.Decimal>();
      for (const entry of current.ledgerEntries) effect.set(entry.accountId, (effect.get(entry.accountId) ?? new Prisma.Decimal(0)).add(entry.amount));
      const accounts = await lockAccounts(tx, userId, [...effect.keys()]);
      for (const [accountId, delta] of effect) {
        const balance = accounts.get(accountId)!.balance.sub(delta);
        if (balance.lt(0)) throw new ApiError(409, "LEDGER_INVARIANT_VIOLATION", "The transaction cannot be reversed without creating a negative balance");
        await tx.account.update({ where: { id: accountId }, data: { balance } });
      }
      await addLedgerEntries(tx, current.id, new Map([...effect].map(([accountId, delta]) => [accountId, delta.negated()])));
      return tx.transaction.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
    });
  }

  async get(userId: string, transactionId: string) {
    const transaction = await this.db.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
      include: { account: { select: { id: true, name: true, type: true, mask: true } }, toAccount: { select: { id: true, name: true, type: true, mask: true } }, category: { select: { id: true, name: true, type: true, icon: true, color: true } } },
    });
    if (!transaction) throw new ApiError(404, "TRANSACTION_NOT_FOUND", "The transaction was not found");
    return transaction;
  }

  async list(userId: string, options: ListOptions) {
    const dateFilter = options.dateFrom || options.dateTo ? { gte: options.dateFrom ? new Date(options.dateFrom) : undefined, lte: options.dateTo ? new Date(options.dateTo) : undefined } : undefined;
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      ...(options.type ? { type: options.type } : {}),
      ...(options.categoryId ? { categoryId: options.categoryId } : {}),
      ...(options.accountId ? { OR: [{ accountId: options.accountId }, { toAccountId: options.accountId }] } : {}),
      ...(dateFilter ? { transactionDate: dateFilter } : {}),
      ...(options.search ? { AND: [{ OR: [
        { description: { contains: options.search, mode: "insensitive" } },
        { category: { is: { name: { contains: options.search, mode: "insensitive" } } } },
        { account: { is: { name: { contains: options.search, mode: "insensitive" } } } },
        { toAccount: { is: { name: { contains: options.search, mode: "insensitive" } } } },
      ] }] } : {}),
    };
    const subtotalFilters: Prisma.Sql[] = [Prisma.sql`t.user_id = ${userId}::uuid`, Prisma.sql`t.deleted_at IS NULL`];
    if (options.type) subtotalFilters.push(Prisma.sql`t."type" = ${options.type}::"TransactionType"`);
    if (options.categoryId) subtotalFilters.push(Prisma.sql`t.category_id = ${options.categoryId}::uuid`);
    if (options.accountId) subtotalFilters.push(Prisma.sql`(t.account_id = ${options.accountId}::uuid OR t.to_account_id = ${options.accountId}::uuid)`);
    if (options.dateFrom) subtotalFilters.push(Prisma.sql`t.transaction_date >= ${new Date(options.dateFrom)}`);
    if (options.dateTo) subtotalFilters.push(Prisma.sql`t.transaction_date <= ${new Date(options.dateTo)}`);
    if (options.search) {
      const pattern = `%${options.search}%`;
      subtotalFilters.push(Prisma.sql`(t.description ILIKE ${pattern} OR c.name ILIKE ${pattern} OR a.name ILIKE ${pattern} OR destination.name ILIKE ${pattern})`);
    }
    const direction = options.sort === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const [rows, total, dailyTotals] = await this.db.$transaction([
      this.db.transaction.findMany({ where, include: { account: { select: { id: true, name: true } }, toAccount: { select: { id: true, name: true } }, category: { select: { id: true, name: true, icon: true, color: true } } }, orderBy: { transactionDate: options.sort }, skip: (options.page - 1) * options.limit, take: options.limit }),
      this.db.transaction.count({ where }),
      this.db.$queryRaw<Array<{ date: string; subtotal: Prisma.Decimal }>>(Prisma.sql`
        SELECT (t.transaction_date AT TIME ZONE 'UTC')::date::text AS date,
          COALESCE(SUM(CASE WHEN t."type" = 'INCOME' THEN t.amount WHEN t."type" = 'EXPENSE' THEN -t.amount ELSE 0::numeric END), 0)::numeric AS subtotal
        FROM wealth_transactions t
        LEFT JOIN wealth_categories c ON c.id = t.category_id
        LEFT JOIN wealth_accounts a ON a.id = t.account_id
        LEFT JOIN wealth_accounts destination ON destination.id = t.to_account_id
        WHERE ${Prisma.join(subtotalFilters, " AND ")}
        GROUP BY date
        ORDER BY date ${direction}
      `),
    ]);
    const subtotalByDate = new Map(dailyTotals.map(({ date, subtotal }) => [date, subtotal]));
    const groups = new Map<string, { date: string; subtotal: Prisma.Decimal; transactions: typeof rows }>();
    for (const transaction of rows) {
      const date = transaction.transactionDate.toISOString().slice(0, 10);
      const group = groups.get(date) ?? { date, subtotal: subtotalByDate.get(date) ?? new Prisma.Decimal(0), transactions: [] };
      group.transactions.push(transaction);
      groups.set(date, group);
    }
    return {
      items: [...groups.values()].map((group) => ({ ...group, subtotal: group.subtotal.toFixed(2) })),
      pagination: { page: options.page, limit: options.limit, total, pages: Math.ceil(total / options.limit) },
    };
  }
}