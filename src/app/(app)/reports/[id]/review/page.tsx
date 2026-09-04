"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReportView } from "@/components/ReportView";
import Link from "next/link";

export default function ManagerReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setReport(d.report);
      });
  }, [id]);

  async function act(action: "APPROVE" | "REQUEST_CHANGES") {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/reports/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Review failed");
      return;
    }
    router.push(`/reports/${id}`);
    router.refresh();
  }

  if (error && !report) return <p className="text-red-700">{error}</p>;
  if (!report) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Manager review</h1>
          <p className="text-sm text-[var(--muted)]">
            Approve the report or request changes with one general comment. You cannot edit the
            member&apos;s content.
          </p>
        </div>
        <Link href={`/reports/${id}`} className="btn-secondary">
          Read-only view
        </Link>
      </div>

      <div className="card-panel space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Review comment</span>
          <textarea
            className="field"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Required when requesting changes"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            className="btn-primary"
            onClick={() => act("APPROVE")}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={loading}
            className="btn-danger"
            onClick={() => act("REQUEST_CHANGES")}
          >
            Request changes
          </button>
        </div>
      </div>

      <div className="card-panel">
        <ReportView report={report as never} />
      </div>
    </div>
  );
}
