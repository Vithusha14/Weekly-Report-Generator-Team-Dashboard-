import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { weekLabel } from "@/lib/utils";

export default async function ReportHistoryPage() {
  const session = await auth();
  if (!session?.user) return null;

  const reports = await prisma.report.findMany({
    where: { authorId: session.user.id },
    include: { project: true },
    orderBy: [{ weekStart: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Report history</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your weekly reports and current status
          </p>
        </div>
        <Link href="/reports/new" className="btn-primary">
          New weekly report
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--sand)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Week</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{weekLabel(r.weekStart, r.weekEnd)}</td>
                <td className="px-4 py-3">{r.project.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/reports/${r.id}`} className="text-[var(--accent)] underline">
                    View
                  </Link>
                  {(r.status === "DRAFT" || r.status === "NEEDS_CORRECTION") && (
                    <>
                      {" · "}
                      <Link
                        href={`/reports/${r.id}/edit`}
                        className="text-[var(--accent)] underline"
                      >
                        Edit
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                  No reports yet. Create your first weekly report.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
