import type { ErrorRequestHandler, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request: Request, response: Response, _next) => {
  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({ success: false, error: { code: "REQUEST_TOO_LARGE", message: "The request exceeds the allowed size" } });
    return;
  }
  if (error instanceof Error && "type" in error && error.type === "entity.parse.failed") {
    response.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "The request body is not valid JSON" } });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() } });
    return;
  }
  if (error instanceof ApiError) {
    response.status(error.status).json({ success: false, error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const knownErrors: Record<string, { status: number; code: string; message: string }> = {
      P2002: { status: 409, code: "CONFLICT", message: "A record with these details already exists" },
      P2003: { status: 409, code: "RELATED_RECORD_EXISTS", message: "The record is referenced by other financial data" },
      P2025: { status: 404, code: "NOT_FOUND", message: "The requested record was not found" },
      P2034: { status: 409, code: "TRANSACTION_CONFLICT", message: "The operation conflicted with another update; retry the request" },
    };
    const mapped = knownErrors[error.code];
    if (mapped) {
      response.status(mapped.status).json({ success: false, error: { code: mapped.code, message: mapped.message } });
      return;
    }
  }
  console.error("Unhandled wealth API error", error);
  response.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } });
};

export const requireUserId = (request: Request): string => {
  if (!request.auth?.userId) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Authentication is required");
  return request.auth.userId;
};