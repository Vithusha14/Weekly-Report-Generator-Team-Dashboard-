"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, weekLabel } from "@/lib/utils";

type Task = {
  taskName: string;
  priority: string;
  plannedPercent: number;
  actualPercent: number;
  status: string;
  timePlannedHours: number;
  timeSpentHours: number;
  deliverable: string;
};

type ReportLike = {
  id: string;
  status: string;
  weekStart: string | Date;
  weekEnd: string | Date;
  latestComment?: string | null;
  notes?: string | null;
  links?: string | null;
  tasksCompleted: Task[];
  tasksPlannedNextWeek: string[];
  blockers: { text: string; isKeyIssue?: boolean }[];
  achievements: { text: string; isKeyAchievement?: boolean }[];
  hoursByType?: Record<string, number> | null;
  author?: { name: string; email?: string };
  project?: { name: string };
  versions?: {
    id: string;
    versionNumber: number;
    submittedAt: string | Date;
    snapshot: Record<string, unknown>;
    reviewActions?: {
      id: string;
      action: string;
      comment?: string | null;
      createdAt: string | Date;
      reviewer?: { name: string };
    }[];
  }[];
  reviewActions?: {
    id: string;
    action: string;
    comment?: string | null;
    createdAt: string | Date;
    reviewer?: { name: string };
  }[];
};

export function ReportView({ report }: { report: ReportLike }) {
  const [openVersion, setOpenVersion] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">
            {report.author?.name ? `${report.author.name} · ` : ""}
            Weekly report
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            {weekLabel(report.weekStart, report.weekEnd)}
            {report.project ? ` · ${report.project.name}` : ""}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {report.status === "NEEDS_CORRECTION" && report.latestComment && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="font-semibold">Manager feedback</div>
          <p className="mt-1">{report.latestComment}</p>
        </div>
      )}

      <section>
        <h2 className="section-title mb-2">Tasks completed</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--sand)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2">Task</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Plan/Actual %</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Hours</th>
                <th className="px-3 py-2">Deliverable</th>
              </tr>
            </thead>
            <tbody>
              {(report.tasksCompleted || []).map((t, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{t.taskName}</td>
                  <td className="px-3 py-2">{t.priority}</td>
                  <td className="px-3 py-2">
                    {t.plannedPercent}% / {t.actualPercent}%
                  </td>
                  <td className="px-3 py-2">{t.status}</td>
                  <td className="px-3 py-2">
                    {t.timePlannedHours}h / {t.timeSpentHours}h
                  </td>
                  <td className="px-3 py-2">{t.deliverable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="section-title mb-2">Planned next week</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {(report.tasksPlannedNextWeek || []).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="section-title mb-2">Hours by type</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(report.hoursByType || {}).map(([k, v]) => (
              <li key={k} className="flex justify-between border-b border-[var(--border)] py-1">
                <span>{k}</span>
                <span>{v}h</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="section-title mb-2">Blockers</h2>
          <ul className="space-y-2 text-sm">
            {(report.blockers || []).map((b, i) => (
              <li key={i} className="rounded-md border border-[var(--border)] px-3 py-2">
                {b.text}
                {b.isKeyIssue && (
                  <span className="ml-2 text-xs font-semibold text-amber-800">KEY ISSUE</span>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="section-title mb-2">Achievements</h2>
          <ul className="space-y-2 text-sm">
            {(report.achievements || []).map((a, i) => (
              <li key={i} className="rounded-md border border-[var(--border)] px-3 py-2">
                {a.text}
                {a.isKeyAchievement && (
                  <span className="ml-2 text-xs font-semibold text-emerald-800">KEY</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {(report.notes || report.links) && (
        <section className="grid gap-4 md:grid-cols-2 text-sm">
          {report.notes && (
            <div>
              <h2 className="section-title mb-2">Notes</h2>
              <p className="whitespace-pre-wrap">{report.notes}</p>
            </div>
          )}
          {report.links && (
            <div>
              <h2 className="section-title mb-2">Links</h2>
              <p className="whitespace-pre-wrap break-all">{report.links}</p>
            </div>
          )}
        </section>
      )}

      {!!report.versions?.length && (
        <section>
          <h2 className="section-title mb-2">Version history</h2>
          <div className="space-y-2">
            {report.versions.map((v) => (
              <div key={v.id} className="rounded-md border border-[var(--border)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--sand)]"
                  onClick={() => setOpenVersion(openVersion === v.id ? null : v.id)}
                >
                  <span>
                    Version {v.versionNumber} · submitted {formatDate(v.submittedAt)}
                  </span>
                  <span className="text-[var(--muted)]">
                    {openVersion === v.id ? "Hide" : "View"}
                  </span>
                </button>
                {openVersion === v.id && (
                  <div className="border-t border-[var(--border)] bg-[var(--sand)]/40 px-3 py-3 text-xs">
                    <pre className="overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(v.snapshot, null, 2)}
                    </pre>
                    {!!v.reviewActions?.length && (
                      <div className="mt-3 space-y-1">
                        <div className="font-medium">Comments on this version</div>
                        {v.reviewActions.map((ra) => (
                          <div key={ra.id}>
                            {ra.reviewer?.name}: {ra.action} — {ra.comment || "—"} (
                            {formatDate(ra.createdAt)})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!!report.reviewActions?.length && (
        <section>
          <h2 className="section-title mb-2">Review history</h2>
          <ul className="space-y-2 text-sm">
            {report.reviewActions.map((ra) => (
              <li key={ra.id} className="rounded-md border border-[var(--border)] px-3 py-2">
                <div className="font-medium">
                  {ra.action.replace("_", " ")} · {ra.reviewer?.name} · {formatDate(ra.createdAt)}
                </div>
                {ra.comment && <p className="mt-1 text-[var(--muted)]">{ra.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
