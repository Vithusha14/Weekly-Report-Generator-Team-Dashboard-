import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoles, requireSession, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const authResult = await requireSession();
  if ("error" in authResult && authResult.error) return authResult.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const projects = await prisma.project.findMany({
    where: q
      ? { name: { contains: q, mode: "insensitive" } }
      : undefined,
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { reports: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const authResult = await requireRoles([Role.ADMIN, Role.MANAGER]);
  if ("error" in authResult && authResult.error) return authResult.error;

  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        memberships: parsed.data.memberIds?.length
          ? {
              create: parsed.data.memberIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch {
    return jsonError("Could not create project (name may already exist)", 409);
  }
}
