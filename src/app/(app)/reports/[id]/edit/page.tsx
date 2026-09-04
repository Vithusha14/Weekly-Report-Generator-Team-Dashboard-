"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReportForm, type ReportFormValues } from "@/components/ReportForm";

export default function EditReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [initial, setInitial] = useState<ReportFormValues | null>(null);
  const [status, setStatus] = useState<string>("");
  const [comment, setComment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch(`/api/reports/${id}`).then((r) => r.json()),
    ]).then(([proj, rep]) => {
      setProjects(proj.projects || []);
      if (rep.error) {
        setError(rep.error);
        return;
      }
      const r = rep.report;
      setStatus(r.status);
      setComment(r.latestComment);
      setInitial({
        weekStart: r.weekStart.slice(0, 10),
        weekEnd: r.weekEnd.slice(0, 10),
        projectId: r.projectId,
        tasksCompleted: r.tasksCompleted,
        tasksPlannedNextWeek: r.tasksPlannedNextWeek,
        blockers: r.blockers,
        achievements: r.achievements,
        hoursByType: r.hoursByType || {
          Development: 0,
          Testing: 0,
          Meetings: 0,
          Documentation: 0,
        },
        notes: r.notes || "",
        links: r.links || "",
      });
    });
  }, [id]);

  async function onSubmit(values: ReportFormValues) {
    const res = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");
    router.refresh();
  }

  async function submitForReview() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/reports/${id}/submit`, { method: "POST" });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Submit failed");
      return;
    }
    router.push(`/reports/${id}`);
    router.refresh();
  }

  if (error && !initial) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!initial) return <p className="text-[var(--muted)]">Loading…</p>;

  if (status !== "DRAFT" && status !== "NEEDS_CORRECTION") {
    return (
      <div className="card-panel">
        <p>This report is {status} and can no longer be edited.</p>
        <button type="button" className="btn-secondary mt-3" onClick={() => router.push(`/reports/${id}`)}>
          View report
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Edit weekly report</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Status: {status}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={submitting}
          onClick={submitForReview}
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </div>

      {status === "NEEDS_CORRECTION" && comment && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="font-semibold">Manager feedback — please address before resubmitting</div>
          <p className="mt-1">{comment}</p>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="card-panel">
        <ReportForm
          initial={initial}
          projects={projects}
          onSubmit={onSubmit}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
