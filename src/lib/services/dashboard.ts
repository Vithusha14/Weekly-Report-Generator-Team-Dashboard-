import { ReportStatus, Role } from "@prisma/client";
import { endOfDay, endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function getDashboardMetrics(options?: {
  weekStart?: Date;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const hasRange = !!(options?.dateFrom || options?.dateTo);
  const start =
    options?.dateFrom ??
    options?.weekStart ??
    startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = options?.dateTo
    ? endOfDay(options.dateTo)
    : options?.dateFrom
      ? endOfDay(options.dateFrom)
      : endOfWeek(options?.weekStart ?? start, { weekStartsOn: 1 });

  // For single-week mode (no explicit range), keep week-aligned window
  const rangeStart = hasRange
    ? start
    : startOfWeek(start, { weekStartsOn: 1 });
  const rangeEnd = hasRange
    ? end
    : endOfWeek(start, { weekStartsOn: 1 });

  const members = await prisma.user.findMany({
    where: { role: Role.TEAM_MEMBER },
    select: { id: true, name: true, email: true },
  });

  const reports = await prisma.report.findMany({
    where: {
      weekStart: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      author: { select: { id: true, name: true } },
      project: true,
    },
  });

  const byAuthor = new Map(reports.map((r) => [r.authorId, r]));
  const submittedStatuses: ReportStatus[] = [
    ReportStatus.SUBMITTED,
    ReportStatus.NEEDS_CORRECTION,
    ReportStatus.APPROVED,
  ];

  const submittedThisWeek = reports.filter((r) =>
    submittedStatuses.includes(r.status)
  ).length;
  const needsCorrection = reports.filter(
    (r) => r.status === ReportStatus.NEEDS_CORRECTION
  ).length;
  const drafts = reports.filter((r) => r.status === ReportStatus.DRAFT).length;
  const notStarted = members.filter((m) => !byAuthor.has(m.id)).length;
  // Pending = not yet past draft into the review pipeline
  const pending = drafts + notStarted;

  // Late: week has ended and the member still has not submitted
  // (NOT_STARTED or DRAFT), OR they submitted after the week ended.
  const now = new Date();
  let late = 0;
  for (const m of members) {
    const report = byAuthor.get(m.id);
    if (!report) {
      if (now > rangeEnd) late += 1;
      continue;
    }
    if (report.status === ReportStatus.DRAFT && now > report.weekEnd) {
      late += 1;
      continue;
    }
    if (
      report.submittedAt &&
      report.submittedAt > endOfDay(report.weekEnd)
    ) {
      late += 1;
    }
  }

  let openBlockers = 0;
  for (const r of reports) {
    // Only count blockers on non-draft reports for managers
    if (r.status === ReportStatus.DRAFT) continue;
    const blockers = (r.blockers as { text: string }[]) || [];
    openBlockers += blockers.length;
  }

  const complianceRate =
    members.length === 0
      ? 0
      : Math.round((submittedThisWeek / members.length) * 100);

  const statusByMember = members.map((m) => {
    const report = byAuthor.get(m.id);
    return {
      memberId: m.id,
      memberName: m.name,
      status: report?.status ?? "NOT_STARTED",
      // Never expose draft report IDs to managers (content is private)
      reportId:
        report && report.status !== ReportStatus.DRAFT ? report.id : null,
      projectName: report?.project.name ?? null,
    };
  });

  const statusDistribution = [
    {
      status: "Approved",
      count: statusByMember.filter((m) => m.status === "APPROVED").length,
    },
    {
      status: "Submitted",
      count: statusByMember.filter((m) => m.status === "SUBMITTED").length,
    },
    {
      status: "Needs correction",
      count: statusByMember.filter((m) => m.status === "NEEDS_CORRECTION").length,
    },
    {
      status: "Draft",
      count: statusByMember.filter((m) => m.status === "DRAFT").length,
    },
    {
      status: "Not started",
      count: statusByMember.filter((m) => m.status === "NOT_STARTED").length,
    },
  ];

  const workloadByProject = Object.values(
    reports
      .filter((r) => r.status !== ReportStatus.DRAFT)
      .reduce<Record<string, { project: string; hours: number; reports: number }>>(
        (acc, r) => {
          const hours = r.hoursByType as Record<string, number> | null;
          const total = hours
            ? Object.values(hours).reduce((s, n) => s + (Number(n) || 0), 0)
            : 0;
          const key = r.project.name;
          if (!acc[key]) acc[key] = { project: key, hours: 0, reports: 0 };
          acc[key].hours += total;
          acc[key].reports += 1;
          return acc;
        },
        {}
      )
  );

  const timeByType = { Development: 0, Testing: 0, Meetings: 0, Documentation: 0 };
  for (const r of reports) {
    if (r.status === ReportStatus.DRAFT) continue;
    const hours = r.hoursByType as Record<string, number> | null;
    if (!hours) continue;
    for (const key of Object.keys(timeByType) as (keyof typeof timeByType)[]) {
      timeByType[key] += Number(hours[key] || 0);
    }
  }

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    const weekReports = await prisma.report.findMany({
      where: {
        weekStart: { gte: ws, lte: we },
        status: { not: ReportStatus.DRAFT },
      },
      select: { tasksCompleted: true, author: { select: { name: true } } },
    });
    let teamTasks = 0;
    const perPerson: Record<string, number> = {};
    for (const wr of weekReports) {
      const tasks = (wr.tasksCompleted as unknown[]) || [];
      teamTasks += tasks.length;
      perPerson[wr.author.name] = (perPerson[wr.author.name] || 0) + tasks.length;
    }
    trend.push({
      week: ws.toISOString().slice(0, 10),
      teamTasks,
      perPerson,
    });
  }

  const recentActivity = await prisma.reviewAction.findMany({
    take: 15,
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: { select: { name: true } },
      report: {
        select: {
          id: true,
          author: { select: { name: true } },
          weekStart: true,
        },
      },
    },
  });

  // Side-by-side section views must not include draft content
  const visibleReports = reports.filter((r) => r.status !== ReportStatus.DRAFT);

  return {
    weekStart: rangeStart,
    weekEnd: rangeEnd,
    metrics: {
      totalSubmittedThisWeek: submittedThisWeek,
      complianceRate,
      needsCorrection,
      openBlockers,
      pending: Math.max(pending, 0),
      late,
      drafts,
      notStarted,
      memberCount: members.length,
    },
    statusByMember,
    statusDistribution,
    workloadByProject,
    timeByType,
    tasksTrend: trend,
    recentActivity,
    reports: visibleReports,
  };
}
