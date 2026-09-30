import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { TransactionType, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const requestSchema = z.object({
  format: z.enum(["PDF", "XLSX"]),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().uuid().optional(),
}).strict();

const buildPdf = async (transactions: Array<{ transactionDate: Date; type: string; amount: Prisma.Decimal; currency: string; account: { name: string }; category: { name: string } | null; description: string }>, totals: Map<string, Prisma.Decimal>) => new Promise<Buffer>((resolve, reject) => {
  const document = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  document.on("end", () => resolve(Buffer.concat(chunks)));
  document.on("error", reject);
  document.fontSize(18).text("Moliyam financial report");
  document.moveDown();
  document.fontSize(10);
  for (const [currency, total] of totals) document.text(`Net flow (${currency}): ${total.toFixed(2)}`);
  document.moveDown();
  for (const item of transactions) {
    const category = item.category?.name ?? (item.type === "TRANSFER" ? "Transfer" : "Uncategorized");
    const row = `${item.transactionDate.toISOString().slice(0, 10)} | ${item.type} | ${item.amount.toFixed(2)} ${item.currency} | ${item.account.name} | ${category} | ${item.description}`;
    document.text(row, { width: 515 });
    document.moveDown(0.35);
  }
  document.end();
});

router.post("/export", requireAuth, async (request, response) => {
  const input = requestSchema.parse(request.body);
  const from = new Date(`${input.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${input.dateTo}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new ApiError(400, "INVALID_DATE_RANGE", "dateFrom must be on or before dateTo");
  if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) throw new ApiError(422, "DATE_RANGE_TOO_LARGE", "Reports are limited to a 366-day date range");
  to.setUTCDate(to.getUTCDate() + 1);

  const userId = requireUserId(request);
  const subscription = await prisma.subscription.findUnique({ where: { userId }, include: { plan: true } });
  const active = subscription?.status === "ACTIVE" && (!subscription.expiresAt || subscription.expiresAt > new Date());
  const allowed = active && subscription ? input.format === "PDF" ? subscription.plan.pdfExport : subscription.plan.xlsxExport : false;
  if (!allowed) throw new ApiError(403, "PRO_REQUIRED", "An active plan with report export access is required");

  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, transactionDate: { gte: from, lt: to }, ...(input.type ? { type: input.type } : {}), ...(input.categoryId ? { categoryId: input.categoryId } : {}) },
    include: { account: { select: { name: true } }, category: { select: { name: true } } },
    orderBy: { transactionDate: "asc" },
    take: 10_001,
  });
  if (transactions.length > 10_000) throw new ApiError(422, "REPORT_TOO_LARGE", "Narrow the date range to export at most 10,000 transactions");
  const totals = new Map<string, Prisma.Decimal>();
  for (const transaction of transactions) {
    const signed = transaction.type === "INCOME" ? transaction.amount : transaction.type === "EXPENSE" ? transaction.amount.negated() : new Prisma.Decimal(0);
    totals.set(transaction.currency, (totals.get(transaction.currency) ?? new Prisma.Decimal(0)).add(signed));
  }

  if (input.format === "XLSX") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transactions");
    sheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Type", key: "type", width: 14 },
      { header: "Amount", key: "amount", width: 20 },
      { header: "Currency", key: "currency", width: 12 },
      { header: "Account", key: "account", width: 24 },
      { header: "Category", key: "category", width: 24 },
      { header: "Description", key: "description", width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const item of transactions) sheet.addRow({ date: item.transactionDate.toISOString().slice(0, 10), type: item.type, amount: item.amount.toFixed(2), currency: item.currency, account: item.account.name, category: item.category?.name ?? (item.type === "TRANSFER" ? "Transfer" : "Uncategorized"), description: item.description });
    const summary = workbook.addWorksheet("Summary");
    summary.addRow(["Currency", "Net flow"]);
    summary.getRow(1).font = { bold: true };
    for (const [currency, amount] of totals) summary.addRow([currency, amount.toFixed(2)]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    response.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").attachment("moliyam-report.xlsx").send(buffer);
    return;
  }

  const buffer = await buildPdf(transactions, totals);
  response.type("application/pdf").attachment("moliyam-report.pdf").send(buffer);
});

export { router as reportRoutes };