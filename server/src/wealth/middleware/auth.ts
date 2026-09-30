import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

type AccessClaims = jwt.JwtPayload & { sub: string; sid: string; tokenType: "access" };

export const requireAuth: RequestHandler = async (request, response, next) => {
  const header = request.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!token || !secret) {
    response.status(401).json({ success: false, error: { code: "AUTHENTICATION_REQUIRED", message: "A valid access token is required" } });
    return;
  }

  try {
    const claims = jwt.verify(token, secret, { algorithms: ["HS256"], issuer: "moliyam-wealth", audience: "moliyam-android" }) as AccessClaims;
    if (claims.tokenType !== "access" || !claims.sub || !claims.sid) throw new Error("Invalid claims");
    const session = await prisma.session.findFirst({
      where: { id: claims.sid, userId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } },
      select: { id: true, userId: true },
    });
    if (!session) {
      response.status(401).json({ success: false, error: { code: "SESSION_EXPIRED", message: "The session is no longer active" } });
      return;
    }
    request.auth = { userId: session.userId, sessionId: session.id };
    next();
  } catch {
    response.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "The access token is invalid or expired" } });
  }
};