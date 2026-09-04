"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportForm, defaultReportValues, type ReportFormValues } from "@/components/ReportForm";

export default function NewReportPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  async function onSubmit(values: ReportFormValues) {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create");
    router.push(`/reports/${data.report.id}/edit`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Create weekly report</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Fixed structure for the whole team — saved as draft until you submit
        </p>
      </div>
      <div className="card-panel">
        <ReportForm
          initial={defaultReportValues(projects[0]?.id || "")}
          projects={projects}
          onSubmit={onSubmit}
          submitLabel="Save draft"
        />
      </div>
    </div>
  );
}
