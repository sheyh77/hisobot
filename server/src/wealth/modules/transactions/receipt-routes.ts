import { Router, type RequestHandler } from "express";
import { fileTypeFromBuffer } from "file-type";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { S3CompatibleStorage } from "../../services/object-storage.js";

const router = Router();
const storage = new S3CompatibleStorage();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
const parseReceipt: RequestHandler = (request, response, next) => upload.single("file")(request, response, (error: unknown) => {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return next(new ApiError(413, "UPLOAD_TOO_LARGE", "Receipt files must not exceed 5 MB"));
  return next(new ApiError(400, "INVALID_UPLOAD", "A single receipt file is required"));
});
const idSchema = z.string().uuid();
const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

router.post("/:id/receipt", requireAuth, parseReceipt, async (request, response) => {
  const transactionId = idSchema.parse(request.params.id);
  const file = request.file;
  if (!file) throw new ApiError(400, "RECEIPT_REQUIRED", "A receipt file is required");
  const detected = await fileTypeFromBuffer(file.buffer);
  const extension = detected ? allowedTypes.get(detected.mime) : undefined;
  if (!detected || !extension || file.mimetype !== detected.mime) throw new ApiError(422, "INVALID_RECEIPT_TYPE", "Only matching JPEG, PNG, or WebP files are accepted");
  const userId = requireUserId(request);
  const transaction = await prisma.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null }, select: { id: true } });
  if (!transaction) throw new ApiError(404, "TRANSACTION_NOT_FOUND", "The transaction was not found");
  const key = storage.newKey(userId, transactionId, extension);
  await storage.put(key, file.buffer, detected.mime);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null }, select: { id: true } });
      if (!current) throw new ApiError(404, "TRANSACTION_NOT_FOUND", "The transaction was not found");
      const previous = await tx.attachment.findMany({ where: { transactionId, userId }, select: { storageKey: true } });
      await tx.attachment.deleteMany({ where: { transactionId, userId } });
      const attachment = await tx.attachment.create({ data: { userId, transactionId, storageKey: key, mimeType: detected.mime, sizeBytes: file.size } });
      await tx.transaction.update({ where: { id: transactionId }, data: { receiptUrl: `/api/transactions/${transactionId}/receipt` } });
      return { attachment, previous };
    });
    for (const old of result.previous) await storage.delete(old.storageKey).catch((error) => console.error("Old receipt cleanup failed", error));
    response.status(201).json({ success: true, data: { id: result.attachment.id, receiptUrl: `/api/transactions/${transactionId}/receipt`, mimeType: result.attachment.mimeType, sizeBytes: result.attachment.sizeBytes } });
  } catch (error) {
    await storage.delete(key).catch((cleanupError) => console.error("Receipt cleanup failed", cleanupError));
    throw error;
  }
});

router.get("/:id/receipt", requireAuth, async (request, response) => {
  const transactionId = idSchema.parse(request.params.id);
  const userId = requireUserId(request);
  const attachment = await prisma.attachment.findFirst({ where: { transactionId, userId, transaction: { is: { deletedAt: null } } }, select: { storageKey: true } });
  if (!attachment) throw new ApiError(404, "RECEIPT_NOT_FOUND", "The receipt was not found");
  response.json({ success: true, data: { url: await storage.signedReadUrl(attachment.storageKey), expiresIn: 300 } });
});

export { router as receiptRoutes };