import { NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/api";
import * as reportService from "@/lib/services/reports";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const authResult = await requireSession();
  if ("error" in authResult) return authResult.error;
  const { session } = authResult;
  const { id } = await ctx.params;

  const result = await reportService.submitReport(id, session.user.id, session.user.role);
  if (result.error === "NOT_FOUND") return jsonError("Not found", 404);
  if (result.error === "FORBIDDEN") return jsonError("Forbidden", 403);
  if (result.error === "INVALID_STATUS") {
    return jsonError("Report can only be submitted from Draft or Needs Correction", 400);
  }
  return NextResponse.json({ report: result.report });
}
