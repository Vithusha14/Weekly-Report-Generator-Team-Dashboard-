import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isManagerOrAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { weekLabel } from "@/lib/utils";

type Props = { params: Promise<{ userId: string }> };

export default async function TeamMemberProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !isManagerOrAdmin(session.user.role)) {
    return <p className="text-red-700">Managers only</p>;
  }

  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projectMemberships: { include: { project: true } },
      reports: {
        include: { project: true },
        orderBy: { weekStart: "desc" },
      },
    },
  });

  if (!user) notFound();

  const stats = {
    total: user.reports.length,
    approved: user.reports.filter((r) => r.status === "APPROVED").length,
    submitted: user.reports.filter((r) => r.status === "SUBMITTED").length,
    needsCorrection: user.reports.filter((r) => r.status === "NEEDS_CORRECTION").length,
    drafts: user.reports.filter((r) => r.status === "DRAFT").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{user.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {user.email} · {user.role.replace("_", " ")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["Total", stats.total],
            ["Approved", stats.approved],
            ["Submitted", stats.submitted],
            ["Needs correction", stats.needsCorrection],
            ["Drafts", stats.drafts],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="card-panel">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="card-panel">
        <h2 className="section-title mb-2">Projects</h2>
        <p className="text-sm">
          {user.projectMemberships.map((m) => m.project.name).join(", ") || "None assigned"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--sand)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {user.reports.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{weekLabel(r.weekStart, r.weekEnd)}</td>
                <td className="px-4 py-3">{r.project.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "DRAFT" ? (
                    <span className="text-[var(--muted)]">Draft (private)</span>
                  ) : (
                    <>
                      <Link href={`/reports/${r.id}`} className="text-[var(--accent)] underline">
                        Open
                      </Link>
                      {r.status === "SUBMITTED" && (
                        <>
                          {" · "}
                          <Link
                            href={`/reports/${r.id}/review`}
                            className="text-[var(--accent)] underline"
                          >
                            Review
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
