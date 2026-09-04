import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRoles, jsonError } from "@/lib/api";
import { getDashboardMetrics } from "@/lib/services/dashboard";

export async function GET(req: Request) {
  const authResult = await requireRoles([Role.MANAGER, Role.ADMIN]);
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(req.url);
  const weekStartParam = searchParams.get("weekStart");
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");

  try {
    const data = await getDashboardMetrics({
      weekStart: weekStartParam ? new Date(weekStartParam) : undefined,
      dateFrom: dateFromParam ? new Date(dateFromParam) : undefined,
      dateTo: dateToParam ? new Date(dateToParam) : undefined,
    });
    return NextResponse.json(data);
  } catch {
    return jsonError("Failed to load dashboard", 500);
  }
}
