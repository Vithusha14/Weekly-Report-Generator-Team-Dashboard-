import { Role } from "@prisma/client";

export function isManagerOrAdmin(role?: Role | string | null) {
  return role === Role.MANAGER || role === Role.ADMIN;
}

export function isAdmin(role?: Role | string | null) {
  return role === Role.ADMIN;
}

/**
 * Content access rules:
 * - Authors can always access their own reports (any status)
 * - Managers/admins can access non-draft reports only (drafts are private to the author)
 */
export function canAccessReport(
  role: Role | string | null | undefined,
  authorId: string,
  userId: string,
  status?: string | null
) {
  if (!role || !userId) return false;
  if (authorId === userId) return true;
  if (!isManagerOrAdmin(role)) return false;
  // Draft content is author-only; managers may still track Draft/Not started status on the dashboard
  if (status === "DRAFT") return false;
  return true;
}

export function canEditReportContent(
  role: Role | string | null | undefined,
  authorId: string,
  userId: string,
  status: string
) {
  if (role !== Role.TEAM_MEMBER && role !== Role.ADMIN && role !== Role.MANAGER) {
    return false;
  }
  // Managers/admins cannot rewrite content — only the author can
  if (authorId !== userId) return false;
  return status === "DRAFT" || status === "NEEDS_CORRECTION";
}

export function canReviewReport(role?: Role | string | null) {
  return isManagerOrAdmin(role);
}
