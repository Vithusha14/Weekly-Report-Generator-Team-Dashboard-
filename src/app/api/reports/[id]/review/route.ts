import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoles, jsonError } from "@/lib/api";
import { reviewSchema } from "@/lib/validations";
import * as reportService from "@/lib/services/reports";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const authResult = await requireRoles([Role.MANAGER, Role.ADMIN]);
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const result = await reportService.reviewReport(
    id,
    session.user.id,
    session.user.role,
    parsed.data.action,
    parsed.data.comment
  );

  if (result.error === "NOT_FOUND") return jsonError("Not found", 404);
  if (result.error === "FORBIDDEN") return jsonError("Forbidden", 403);
  if (result.error === "INVALID_STATUS") {
    return jsonError("Only submitted reports can be reviewed", 400);
  }
  return NextResponse.json({ report: result.report });
}
