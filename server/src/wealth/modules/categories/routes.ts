import { CategoryType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db.js";
import { ApiError, requireUserId } from "../../errors.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();
const idSchema = z.string().uuid();
const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.nativeEnum(CategoryType),
  icon: z.string().max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict();
const patchSchema = createSchema.omit({ type: true }).partial();

router.use(requireAuth);

router.get("/", async (request, response) => {
  const type = request.query.type === undefined ? undefined : z.nativeEnum(CategoryType).parse(request.query.type);
  const userId = requireUserId(request);
  const data = await prisma.category.findMany({
    where: { OR: [{ userId: null }, { userId }], ...(type ? { type } : {}) },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  response.json({ success: true, data });
});

router.post("/", async (request, response) => {
  const input = createSchema.parse(request.body);
  const data = await prisma.category.create({ data: { userId: requireUserId(request), ...input } });
  response.status(201).json({ success: true, data });
});

router.patch("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const input = patchSchema.parse(request.body);
  if (!Object.keys(input).length) throw new ApiError(400, "EMPTY_UPDATE", "At least one category field must be provided");
  const userId = requireUserId(request);
  const category = await prisma.category.findFirst({ where: { id, userId, isSystem: false }, select: { id: true } });
  if (!category) throw new ApiError(404, "CATEGORY_NOT_FOUND", "The category was not found or cannot be modified");
  const data = await prisma.category.update({ where: { id }, data: input });
  response.json({ success: true, data });
});

router.delete("/:id", async (request, response) => {
  const id = idSchema.parse(request.params.id);
  const userId = requireUserId(request);
  const category = await prisma.category.findFirst({ where: { id, userId, isSystem: false }, select: { id: true } });
  if (!category) throw new ApiError(404, "CATEGORY_NOT_FOUND", "The category was not found or cannot be modified");
  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2003") throw new ApiError(409, "CATEGORY_IN_USE", "Categories referenced by financial records cannot be deleted");
    throw error;
  }
  response.json({ success: true, data: { deleted: true } });
});

export { router as categoryRoutes };