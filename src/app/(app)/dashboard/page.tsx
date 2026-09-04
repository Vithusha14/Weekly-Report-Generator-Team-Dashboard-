"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusBadge } from "@/components/StatusBadge";
import { weekLabel } from "@/lib/utils";

type DashboardData = {
  weekStart: string;
  weekEnd: string;
  metrics: {
    totalSubmittedThisWeek: number;
    complianceRate: number;
    needsCorrection: number;
    openBlockers: number;
    pending: number;
    late: number;
    drafts: number;
    notStarted: number;
    memberCount: number;
  };
  statusByMember: {
    memberId: string;
    memberName: string;
    status: string;
    reportId: string | null;
    projectName: string | null;
  }[];
  statusDistribution: { status: string; count: number }[];
  workloadByProject: { project: string; hours: number; reports: number }[];
  timeByType: Record<string, number>;
  tasksTrend: { week: string; teamTasks: number }[];
  recentActivity: {
    id: string;
    action: string;
    createdAt: string;
    reviewer: { name: string };
    report: { id: string; author: { name: string }; weekStart: string };
  }[];
  reports: {
    id: string;
    status: string;
    weekStart: string;
    weekEnd: string;
    author: { id: string; name: string };
    project: { id: string; name: string };
    blockers: { text: string; isKeyIssue?: boolean }[];
    achievements: { text: string; isKeyAchievement?: boolean }[];
  }[];
};

const STATUS_COLORS = ["#0f6b5c", "#1c4f6e", "#c4a35a", "#8a8a8a", "#b45309"];

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sectionView, setSectionView] = useState<"none" | "blockers" | "achievements">("none");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    // Fallback: if neither set yet, API defaults to current week
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`/api/dashboard${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setData(d);
          if (!dateFrom && d.weekStart) setDateFrom(d.weekStart.slice(0, 10));
          if (!dateTo && d.weekEnd) setDateTo(d.weekEnd.slice(0, 10));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when range changes
  }, [dateFrom, dateTo]);

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    return data.statusByMember.filter((m) => {
      if (memberFilter && m.memberId !== memberFilter) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      if (projectFilter && m.projectName !== projectFilter) return false;
      return true;
    });
  }, [data, memberFilter, projectFilter, statusFilter]);

  const timeChart = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.timeByType).map(([name, hours]) => ({ name, hours }));
  }, [data]);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-[var(--muted)]">Loading dashboard…</p>;

  const projects = Array.from(
    new Set(data.statusByMember.map((m) => m.projectName).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Team dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {weekLabel(data.weekStart, data.weekEnd)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">From</span>
            <input
              type="date"
              className="field"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">To</span>
            <input
              type="date"
              className="field"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ["Submitted", data.metrics.totalSubmittedThisWeek],
          ["Compliance", `${data.metrics.complianceRate}%`],
          ["Pending", data.metrics.pending],
          ["Late", data.metrics.late],
          ["Needs correction", data.metrics.needsCorrection],
          ["Open blockers", data.metrics.openBlockers],
        ].map(([label, value]) => (
          <div key={label as string} className="card-panel">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
            <div className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-panel h-72">
          <h2 className="section-title mb-3">Tasks completed trend</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.tasksTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5cdb9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="teamTasks" stroke="#0f6b5c" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card-panel h-72">
          <h2 className="section-title mb-3">Submission status by team</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.statusDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5cdb9" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.statusDistribution.map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-panel h-72">
          <h2 className="section-title mb-3">Time by task type</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={timeChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5cdb9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#1c4f6e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-panel h-72">
          <h2 className="section-title mb-3">Workload by project</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.workloadByProject}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5cdb9" />
              <XAxis dataKey="project" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#0f6b5c" name="Hours" />
              <Bar dataKey="reports" fill="#c4a35a" name="Reports" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-panel lg:col-span-2">
          <h2 className="section-title mb-3">Recent review activity</h2>
          <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="border-b border-[var(--border)] pb-2">
                <Link href={`/reports/${a.report.id}`} className="font-medium text-[var(--accent)]">
                  {a.report.author.name}
                </Link>{" "}
                — {a.action.replace("_", " ").toLowerCase()} by {a.reviewer.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card-panel space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            className="field max-w-xs"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
          >
            <option value="">All members</option>
            {data.statusByMember.map((m) => (
              <option key={m.memberId} value={m.memberId}>
                {m.memberName}
              </option>
            ))}
          </select>
          <select
            className="field max-w-xs"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className="field max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {["DRAFT", "SUBMITTED", "NEEDS_CORRECTION", "APPROVED", "NOT_STARTED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="field max-w-xs"
            value={sectionView}
            onChange={(e) => setSectionView(e.target.value as typeof sectionView)}
          >
            <option value="none">Full reports list</option>
            <option value="blockers">Side-by-side: Blockers</option>
            <option value="achievements">Side-by-side: Achievements</option>
          </select>
        </div>

        {sectionView === "none" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--sand)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Project</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr key={m.memberId} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">
                      <Link href={`/team/${m.memberId}`} className="text-[var(--accent)] underline">
                        {m.memberName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{m.projectName || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {m.reportId ? (
                        <>
                          <Link href={`/reports/${m.reportId}`} className="underline">
                            Open
                          </Link>
                          {m.status === "SUBMITTED" && (
                            <>
                              {" · "}
                              <Link
                                href={`/reports/${m.reportId}/review`}
                                className="text-[var(--accent)] underline"
                              >
                                Review
                              </Link>
                            </>
                          )}
                        </>
                      ) : m.status === "DRAFT" ? (
                        <span className="text-[var(--muted)]">Draft (private)</span>
                      ) : (
                        <span className="text-[var(--muted)]">Not started</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.reports
              .filter((r) => !memberFilter || r.author.id === memberFilter)
              .map((r) => (
                <div key={r.id} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="font-medium">{r.author.name}</div>
                    <StatusBadge status={r.status} />
                  </div>
                  <ul className="space-y-1 text-sm">
                    {(sectionView === "blockers" ? r.blockers : r.achievements).map((item, i) => (
                      <li key={i}>
                        {"text" in item ? item.text : ""}
                        {"isKeyIssue" in item && item.isKeyIssue ? " ★" : ""}
                        {"isKeyAchievement" in item && item.isKeyAchievement ? " ★" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
