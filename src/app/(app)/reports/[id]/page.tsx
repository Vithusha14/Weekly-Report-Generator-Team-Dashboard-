import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { ReportView } from "@/components/ReportView";
import * as reportService from "@/lib/services/reports";
import { canEditReportContent, canReviewReport } from "@/lib/rbac";

type Props = { params: Promise<{ id: string }> };

export default async function ReportDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) return null;
  const { id } = await params;

  const result = await reportService.getReportForUser(id, session.user.id, session.user.role);
  if (result.error === "NOT_FOUND") notFound();
  if (result.error === "FORBIDDEN") {
    return <p className="text-red-700">You do not have access to this report.</p>;
  }

  const report = result.report!;
  const canEdit = canEditReportContent(
    session.user.role,
    report.authorId,
    session.user.id,
    report.status
  );
  const canReview =
    canReviewReport(session.user.role) && report.status === "SUBMITTED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/reports" className="btn-secondary">
          Back to history
        </Link>
        {canEdit && (
          <Link href={`/reports/${report.id}/edit`} className="btn-primary">
            Edit report
          </Link>
        )}
        {canReview && (
          <Link href={`/reports/${report.id}/review`} className="btn-primary">
            Review report
          </Link>
        )}
      </div>
      <div className="card-panel">
        <ReportView
          report={{
            ...report,
            tasksCompleted: report.tasksCompleted as never,
            tasksPlannedNextWeek: report.tasksPlannedNextWeek as never,
            blockers: report.blockers as never,
            achievements: report.achievements as never,
            hoursByType: report.hoursByType as never,
            versions: report.versions as never,
            reviewActions: report.reviewActions as never,
          }}
        />
      </div>
    </div>
  );
}
