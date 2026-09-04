"use client";

import { useState } from "react";

type Task = {
  taskName: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  plannedPercent: number;
  actualPercent: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  timePlannedHours: number;
  timeSpentHours: number;
  deliverable: string;
};

type Blocker = { text: string; isKeyIssue: boolean };
type Achievement = { text: string; isKeyAchievement: boolean };

export type ReportFormValues = {
  weekStart: string;
  weekEnd: string;
  projectId: string;
  tasksCompleted: Task[];
  tasksPlannedNextWeek: string[];
  blockers: Blocker[];
  achievements: Achievement[];
  hoursByType: {
    Development: number;
    Testing: number;
    Meetings: number;
    Documentation: number;
  };
  notes: string;
  links: string;
};

const emptyTask = (): Task => ({
  taskName: "",
  priority: "MEDIUM",
  plannedPercent: 100,
  actualPercent: 0,
  status: "IN_PROGRESS",
  timePlannedHours: 0,
  timeSpentHours: 0,
  deliverable: "",
});

type Project = { id: string; name: string };

export function ReportForm({
  initial,
  projects,
  onSubmit,
  submitLabel = "Save draft",
}: {
  initial: ReportFormValues;
  projects: Project[];
  onSubmit: (values: ReportFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<ReportFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.projectId) {
      setError("Select a project");
      return;
    }
    if (values.blockers.filter((b) => b.isKeyIssue).length > 1) {
      setError("Only one blocker can be the key issue");
      return;
    }
    if (values.achievements.filter((a) => a.isKeyAchievement).length > 1) {
      setError("Only one achievement can be the key achievement");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Week start</span>
          <input
            type="date"
            required
            className="field"
            value={values.weekStart}
            onChange={(e) => setValues({ ...values, weekStart: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Week end</span>
          <input
            type="date"
            required
            className="field"
            value={values.weekEnd}
            onChange={(e) => setValues({ ...values, weekEnd: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--muted)]">Project / category</span>
          <select
            required
            className="field"
            value={values.projectId}
            onChange={(e) => setValues({ ...values, projectId: e.target.value })}
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Tasks completed</h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setValues({ ...values, tasksCompleted: [...values.tasksCompleted, emptyTask()] })
            }
          >
            Add task
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--sand)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Plan %</th>
                <th className="px-3 py-2 font-medium">Actual %</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Plan hrs</th>
                <th className="px-3 py-2 font-medium">Spent hrs</th>
                <th className="px-3 py-2 font-medium">Deliverable</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {values.tasksCompleted.map((task, idx) => (
                <tr key={idx} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2">
                    <input
                      className="field-sm"
                      value={task.taskName}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = { ...task, taskName: e.target.value };
                        setValues({ ...values, tasksCompleted });
                      }}
                      required
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="field-sm"
                      value={task.priority}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = {
                          ...task,
                          priority: e.target.value as Task["priority"],
                        };
                        setValues({ ...values, tasksCompleted });
                      }}
                    >
                      {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="field-sm w-20"
                      value={task.plannedPercent}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = {
                          ...task,
                          plannedPercent: Number(e.target.value),
                        };
                        setValues({ ...values, tasksCompleted });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="field-sm w-20"
                      value={task.actualPercent}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = {
                          ...task,
                          actualPercent: Number(e.target.value),
                        };
                        setValues({ ...values, tasksCompleted });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="field-sm"
                      value={task.status}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = {
                          ...task,
                          status: e.target.value as Task["status"],
                        };
                        setValues({ ...values, tasksCompleted });
                      }}
                    >
                      {["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className="field-sm w-20"
                      value={task.timePlannedHours}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = {
                          ...task,
                          timePlannedHours: Number(e.target.value),
                        };
                        setValues({ ...values, tasksCompleted });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className="field-sm w-20"
                      value={task.timeSpentHours}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = {
                          ...task,
                          timeSpentHours: Number(e.target.value),
                        };
                        setValues({ ...values, tasksCompleted });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="field-sm"
                      value={task.deliverable}
                      onChange={(e) => {
                        const tasksCompleted = [...values.tasksCompleted];
                        tasksCompleted[idx] = { ...task, deliverable: e.target.value };
                        setValues({ ...values, tasksCompleted });
                      }}
                      required
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-xs text-red-700"
                      onClick={() =>
                        setValues({
                          ...values,
                          tasksCompleted: values.tasksCompleted.filter((_, i) => i !== idx),
                        })
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="section-title mb-3">Tasks planned next week</h2>
          {values.tasksPlannedNextWeek.map((item, idx) => (
            <div key={idx} className="mb-2 flex gap-2">
              <input
                className="field flex-1"
                value={item}
                onChange={(e) => {
                  const tasksPlannedNextWeek = [...values.tasksPlannedNextWeek];
                  tasksPlannedNextWeek[idx] = e.target.value;
                  setValues({ ...values, tasksPlannedNextWeek });
                }}
              />
              <button
                type="button"
                className="text-xs text-red-700"
                onClick={() =>
                  setValues({
                    ...values,
                    tasksPlannedNextWeek: values.tasksPlannedNextWeek.filter((_, i) => i !== idx),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary mt-1"
            onClick={() =>
              setValues({
                ...values,
                tasksPlannedNextWeek: [...values.tasksPlannedNextWeek, ""],
              })
            }
          >
            Add planned task
          </button>
        </div>

        <div>
          <h2 className="section-title mb-3">Hours by type</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["Development", "Testing", "Meetings", "Documentation"] as const).map((key) => (
              <label key={key} className="text-sm">
                <span className="mb-1 block text-[var(--muted)]">{key}</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="field"
                  value={values.hoursByType[key]}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      hoursByType: {
                        ...values.hoursByType,
                        [key]: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="section-title mb-3">Blockers / challenges</h2>
          {values.blockers.map((b, idx) => (
            <div key={idx} className="mb-2 space-y-1 rounded-md border border-[var(--border)] p-3">
              <textarea
                className="field"
                rows={2}
                value={b.text}
                onChange={(e) => {
                  const blockers = [...values.blockers];
                  blockers[idx] = { ...b, text: e.target.value };
                  setValues({ ...values, blockers });
                }}
                required
              />
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={b.isKeyIssue}
                  onChange={(e) => {
                    const blockers = values.blockers.map((item, i) => ({
                      ...item,
                      isKeyIssue: i === idx ? e.target.checked : false,
                    }));
                    setValues({ ...values, blockers });
                  }}
                />
                Key issue for the week
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setValues({
                ...values,
                blockers: [...values.blockers, { text: "", isKeyIssue: false }],
              })
            }
          >
            Add blocker
          </button>
        </div>

        <div>
          <h2 className="section-title mb-3">Achievements / highlights</h2>
          {values.achievements.map((a, idx) => (
            <div key={idx} className="mb-2 space-y-1 rounded-md border border-[var(--border)] p-3">
              <textarea
                className="field"
                rows={2}
                value={a.text}
                onChange={(e) => {
                  const achievements = [...values.achievements];
                  achievements[idx] = { ...a, text: e.target.value };
                  setValues({ ...values, achievements });
                }}
                required
              />
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={a.isKeyAchievement}
                  onChange={(e) => {
                    const achievements = values.achievements.map((item, i) => ({
                      ...item,
                      isKeyAchievement: i === idx ? e.target.checked : false,
                    }));
                    setValues({ ...values, achievements });
                  }}
                />
                Key achievement for the week
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setValues({
                ...values,
                achievements: [...values.achievements, { text: "", isKeyAchievement: false }],
              })
            }
          >
            Add achievement
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Notes</span>
          <textarea
            className="field"
            rows={3}
            value={values.notes}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Links</span>
          <textarea
            className="field"
            rows={3}
            value={values.links}
            onChange={(e) => setValues({ ...values, links: e.target.value })}
            placeholder="https://..."
          />
        </label>
      </section>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export function defaultReportValues(projectId = ""): ReportFormValues {
  const monday = new Date();
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
    projectId,
    tasksCompleted: [emptyTask()],
    tasksPlannedNextWeek: [""],
    blockers: [{ text: "", isKeyIssue: true }],
    achievements: [{ text: "", isKeyAchievement: true }],
    hoursByType: { Development: 0, Testing: 0, Meetings: 0, Documentation: 0 },
    notes: "",
    links: "",
  };
}
