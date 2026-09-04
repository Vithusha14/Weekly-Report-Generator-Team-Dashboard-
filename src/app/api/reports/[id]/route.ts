import { NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api";
import { reportContentSchema } from "@/lib/validations";
import * as reportService from "@/lib/services/reports";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const authResult = await requireSession();
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;
  const { id } = await ctx.params;

  const result = await reportService.getReportForUser(id, session.user.id, session.user.role);
  if (result.error === "NOT_FOUND") return jsonError("Not found", 404);
  if (result.error === "FORBIDDEN") return jsonError("Forbidden", 403);
  return NextResponse.json({ report: result.report });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const authResult = await requireSession();
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = reportContentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const result = await reportService.updateReportContent(id, session.user.id, session.user.role, {
    weekStart: new Date(parsed.data.weekStart),
    weekEnd: new Date(parsed.data.weekEnd),
    projectId: parsed.data.projectId,
    tasksCompleted: parsed.data.tasksCompleted,
    tasksPlannedNextWeek: parsed.data.tasksPlannedNextWeek,
    blockers: parsed.data.blockers,
    achievements: parsed.data.achievements,
    hoursByType: parsed.data.hoursByType,
    notes: parsed.data.notes,
    links: parsed.data.links,
  });

  if (result.error === "NOT_FOUND") return jsonError("Not found", 404);
  if (result.error === "FORBIDDEN") return jsonError("Forbidden", 403);
  return NextResponse.json({ report: result.report });
}
