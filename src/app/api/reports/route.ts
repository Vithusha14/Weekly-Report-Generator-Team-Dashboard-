import { NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api";
import { reportContentSchema } from "@/lib/validations";
import * as reportService from "@/lib/services/reports";

export async function GET(req: Request) {
  const authResult = await requireSession();
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam &&
    ["DRAFT", "SUBMITTED", "NEEDS_CORRECTION", "APPROVED"].includes(statusParam)
      ? (statusParam as "DRAFT" | "SUBMITTED" | "NEEDS_CORRECTION" | "APPROVED")
      : undefined;

  const result = await reportService.listReports({
    userId: session.user.id,
    role: session.user.role,
    authorId: searchParams.get("authorId") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    status,
    weekStart: searchParams.get("weekStart")
      ? new Date(searchParams.get("weekStart")!)
      : undefined,
    weekEnd: searchParams.get("weekEnd")
      ? new Date(searchParams.get("weekEnd")!)
      : undefined,
    page: Number(searchParams.get("page") || 1),
    pageSize: Number(searchParams.get("pageSize") || 20),
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const authResult = await requireSession();
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;

  const body = await req.json();
  const parsed = reportContentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const report = await reportService.createDraftReport(session.user.id, {
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

  return NextResponse.json({ report }, { status: 201 });
}
