import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoles, requireSession, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validations";
import { isManagerOrAdmin } from "@/lib/rbac";
import * as reportService from "@/lib/services/reports";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const authResult = await requireSession();
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;
  const { id } = await ctx.params;

  if (!isManagerOrAdmin(session.user.role) && session.user.id !== id) {
    return jsonError("Forbidden", 403);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      projectMemberships: {
        include: { project: true },
      },
    },
  });
  if (!user) return jsonError("Not found", 404);

  const reports = await reportService.listReports({
    userId: session.user.id,
    role: session.user.role,
    authorId: id,
    pageSize: 50,
  });

  const stats = {
    totalReports: reports.total,
    approved: reports.items.filter((r) => r.status === "APPROVED").length,
    needsCorrection: reports.items.filter((r) => r.status === "NEEDS_CORRECTION").length,
    submitted: reports.items.filter((r) => r.status === "SUBMITTED").length,
    drafts: reports.items.filter((r) => r.status === "DRAFT").length,
  };

  return NextResponse.json({ user, reports: reports.items, stats });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const authResult = await requireRoles([Role.ADMIN]);
  if ("error" in authResult) return authResult.error;
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await prisma.$transaction(async (tx) => {
    if (parsed.data.projectIds) {
      await tx.projectMembership.deleteMany({ where: { userId: id } });
      if (parsed.data.projectIds.length) {
        await tx.projectMembership.createMany({
          data: parsed.data.projectIds.map((projectId) => ({
            userId: id,
            projectId,
          })),
        });
      }
    }

    return tx.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        role: parsed.data.role as Role | undefined,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  });

  return NextResponse.json({ user });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const authResult = await requireRoles([Role.ADMIN]);
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;
  const { id } = await ctx.params;

  if (session.user.id === id) {
    return jsonError("Cannot delete your own account", 400);
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
