import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requireRoles, requireSession, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { isManagerOrAdmin } from "@/lib/rbac";

export async function GET(req: Request) {
  const authResult = await requireSession();
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;

  if (!isManagerOrAdmin(session.user.role)) {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") as Role | null;

  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { reports: true } },
      projectMemberships: {
        include: { project: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const authResult = await requireRoles([Role.ADMIN]);
  if ("error" in authResult) return authResult.error;

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Email already exists", 409);

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: (parsed.data.role as Role) ?? Role.TEAM_MEMBER,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
