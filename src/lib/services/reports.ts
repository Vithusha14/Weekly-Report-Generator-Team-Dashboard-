import { ReportStatus, ReviewActionType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAccessReport, canEditReportContent, canReviewReport } from "@/lib/rbac";

export type ReportContent = {
  tasksCompleted: Prisma.JsonValue;
  tasksPlannedNextWeek: Prisma.JsonValue;
  blockers: Prisma.JsonValue;
  achievements: Prisma.JsonValue;
  hoursByType: Prisma.JsonValue | null;
  notes: string | null;
  links: string | null;
};

function snapshotFromReport(report: ReportContent & { projectId: string; weekStart: Date; weekEnd: Date }) {
  return {
    projectId: report.projectId,
    weekStart: report.weekStart,
    weekEnd: report.weekEnd,
    tasksCompleted: report.tasksCompleted,
    tasksPlannedNextWeek: report.tasksPlannedNextWeek,
    blockers: report.blockers,
    achievements: report.achievements,
    hoursByType: report.hoursByType,
    notes: report.notes,
    links: report.links,
  };
}

export async function listReports(params: {
  userId: string;
  role: string;
  authorId?: string;
  projectId?: string;
  status?: ReportStatus;
  weekStart?: Date;
  weekEnd?: Date;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 100);
  const where: Prisma.ReportWhereInput = {};

  if (params.role === "TEAM_MEMBER") {
    where.authorId = params.userId;
  } else if (params.authorId) {
    where.authorId = params.authorId;
  }

  // Managers/admins must not receive draft report content in list responses
  if (params.role !== "TEAM_MEMBER") {
    if (params.status === "DRAFT") {
      // Explicit draft filter from a manager → empty result (status tracking is on dashboard)
      where.id = "__never__";
    } else if (!params.status) {
      where.status = { not: ReportStatus.DRAFT };
    }
  }

  if (params.projectId) where.projectId = params.projectId;
  if (params.status && params.role === "TEAM_MEMBER") where.status = params.status;
  if (params.status && params.role !== "TEAM_MEMBER" && params.status !== "DRAFT") {
    where.status = params.status;
  }
  if (params.weekStart || params.weekEnd) {
    where.weekStart = {};
    if (params.weekStart) where.weekStart.gte = params.weekStart;
    if (params.weekEnd) where.weekStart.lte = params.weekEnd;
  }

  const [total, items] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        project: true,
        _count: { select: { versions: true, reviewActions: true } },
      },
      orderBy: [{ weekStart: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function getReportForUser(reportId: string, userId: string, role: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      project: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          reviewActions: {
            include: { reviewer: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      reviewActions: {
        include: { reviewer: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!report) return { error: "NOT_FOUND" as const };
  if (!canAccessReport(role, report.authorId, userId, report.status)) {
    return { error: "FORBIDDEN" as const };
  }
  return { report };
}

export async function createDraftReport(
  authorId: string,
  data: {
    weekStart: Date;
    weekEnd: Date;
    projectId: string;
    tasksCompleted: unknown;
    tasksPlannedNextWeek: unknown;
    blockers: unknown;
    achievements: unknown;
    hoursByType?: unknown;
    notes?: string | null;
    links?: string | null;
  }
) {
  return prisma.report.create({
    data: {
      authorId,
      projectId: data.projectId,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      status: ReportStatus.DRAFT,
      tasksCompleted: data.tasksCompleted as Prisma.InputJsonValue,
      tasksPlannedNextWeek: data.tasksPlannedNextWeek as Prisma.InputJsonValue,
      blockers: data.blockers as Prisma.InputJsonValue,
      achievements: data.achievements as Prisma.InputJsonValue,
      hoursByType: (data.hoursByType ?? null) as Prisma.InputJsonValue,
      notes: data.notes ?? null,
      links: data.links ?? null,
    },
    include: { project: true, author: { select: { id: true, name: true, email: true } } },
  });
}

export async function updateReportContent(
  reportId: string,
  userId: string,
  role: string,
  data: {
    weekStart: Date;
    weekEnd: Date;
    projectId: string;
    tasksCompleted: unknown;
    tasksPlannedNextWeek: unknown;
    blockers: unknown;
    achievements: unknown;
    hoursByType?: unknown;
    notes?: string | null;
    links?: string | null;
  }
) {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (!canEditReportContent(role, existing.authorId, userId, existing.status)) {
    return { error: "FORBIDDEN" as const };
  }

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      projectId: data.projectId,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      tasksCompleted: data.tasksCompleted as Prisma.InputJsonValue,
      tasksPlannedNextWeek: data.tasksPlannedNextWeek as Prisma.InputJsonValue,
      blockers: data.blockers as Prisma.InputJsonValue,
      achievements: data.achievements as Prisma.InputJsonValue,
      hoursByType: (data.hoursByType ?? null) as Prisma.InputJsonValue,
      notes: data.notes ?? null,
      links: data.links ?? null,
    },
    include: { project: true, author: { select: { id: true, name: true, email: true } } },
  });

  return { report };
}

export async function submitReport(reportId: string, userId: string, role: string) {
  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (existing.authorId !== userId) return { error: "FORBIDDEN" as const };
  if (existing.status !== ReportStatus.DRAFT && existing.status !== ReportStatus.NEEDS_CORRECTION) {
    return { error: "INVALID_STATUS" as const };
  }

  const nextVersion = (existing.versions[0]?.versionNumber ?? 0) + 1;
  const snap = snapshotFromReport(existing);

  const report = await prisma.$transaction(async (tx) => {
    await tx.reportVersion.create({
      data: {
        reportId,
        versionNumber: nextVersion,
        snapshot: snap as Prisma.InputJsonValue,
        submittedAt: new Date(),
      },
    });

    return tx.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        project: true,
        author: { select: { id: true, name: true, email: true } },
        versions: { orderBy: { versionNumber: "desc" } },
      },
    });
  });

  return { report };
}

export async function reviewReport(
  reportId: string,
  reviewerId: string,
  role: string,
  action: "APPROVE" | "REQUEST_CHANGES",
  comment?: string
) {
  if (!canReviewReport(role)) return { error: "FORBIDDEN" as const };

  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!existing) return { error: "NOT_FOUND" as const };
  if (existing.status !== ReportStatus.SUBMITTED) {
    return { error: "INVALID_STATUS" as const };
  }

  const latestVersion = existing.versions[0];

  const report = await prisma.$transaction(async (tx) => {
    await tx.reviewAction.create({
      data: {
        reportId,
        reportVersionId: latestVersion?.id,
        reviewerId,
        action:
          action === "APPROVE"
            ? ReviewActionType.APPROVED
            : ReviewActionType.REQUESTED_CHANGES,
        comment: comment ?? (action === "APPROVE" ? "Approved" : null),
      },
    });

    return tx.report.update({
      where: { id: reportId },
      data:
        action === "APPROVE"
          ? {
              status: ReportStatus.APPROVED,
              approvedAt: new Date(),
              latestComment: comment ?? "Approved",
            }
          : {
              status: ReportStatus.NEEDS_CORRECTION,
              latestComment: comment!,
            },
      include: {
        project: true,
        author: { select: { id: true, name: true, email: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            reviewActions: {
              include: { reviewer: { select: { id: true, name: true } } },
            },
          },
        },
        reviewActions: {
          include: { reviewer: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  return { report };
}
