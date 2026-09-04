import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

type AuthSuccess = { session: Session & { user: { id: string; role: Role; email: string; name: string } } };
type AuthFailure = { error: NextResponse };

export async function requireSession(): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session: session as AuthSuccess["session"] };
}

export async function requireRoles(roles: Role[]): Promise<AuthSuccess | AuthFailure> {
  const result = await requireSession();
  if ("error" in result) return result;
  if (!roles.includes(result.session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
