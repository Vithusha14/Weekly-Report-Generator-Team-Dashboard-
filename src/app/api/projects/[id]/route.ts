import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoles, requireSession, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;
  const { id } = await ctx.params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { reports: true } },
    },
  });
  if (!project) return jsonError("Not found", 404);
  return NextResponse.json({ project });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const authResult = await requireRoles([Role.ADMIN, Role.MANAGER]);
  if ("error" in authResult && authResult.error) return authResult.error;
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = projectSchema.partial().safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  try {
    const project = await prisma.$transaction(async (tx) => {
      if (parsed.data.memberIds) {
        await tx.projectMembership.deleteMany({ where: { projectId: id } });
        if (parsed.data.memberIds.length) {
          await tx.projectMembership.createMany({
            data: parsed.data.memberIds.map((userId) => ({
              userId,
              projectId: id,
            })),
          });
        }
      }

      return tx.project.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
        },
        include: {
          memberships: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
    });
    return NextResponse.json({ project });
  } catch {
    return jsonError("Update failed", 400);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const authResult = await requireRoles([Role.ADMIN, Role.MANAGER]);
  if ("error" in authResult && authResult.error) return authResult.error;
  const { id } = await ctx.params;

  const reportCount = await prisma.report.count({ where: { projectId: id } });
  if (reportCount > 0) {
    return jsonError("Cannot delete project with existing reports", 409);
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
