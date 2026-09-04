"use client";

import { FormEvent, useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  memberships: { user: { id: string; name: string; email: string } }[];
  _count?: { reports: number };
};

type User = { id: string; name: string; email: string };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [p, u] = await Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    setProjects(p.projects || []);
    setUsers(u.users || []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(project?: Project) {
    if (project) {
      setEditing(project);
      setName(project.name);
      setDescription(project.description || "");
      setMemberIds(project.memberships.map((m) => m.user.id));
    } else {
      setEditing(null);
      setName("");
      setDescription("");
      setMemberIds([]);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { name, description, memberIds };
    const res = await fetch(editing ? `/api/projects/${editing.id}` : "/api/projects", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    startEdit();
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Projects / categories</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage work categories attached to weekly reports
        </p>
      </div>

      <form onSubmit={onSubmit} className="card-panel grid gap-3 md:grid-cols-2">
        <h2 className="section-title md:col-span-2">
          {editing ? `Edit: ${editing.name}` : "Add project"}
        </h2>
        {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Name</span>
          <input className="field" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Description</span>
          <input
            className="field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm text-[var(--muted)]">Assign members (optional)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {users
              .filter((u) => true)
              .map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={memberIds.includes(u.id)}
                    onChange={(e) =>
                      setMemberIds((ids) =>
                        e.target.checked ? [...ids, u.id] : ids.filter((id) => id !== u.id)
                      )
                    }
                  />
                  {u.name}
                </label>
              ))}
          </div>
        </fieldset>
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="btn-primary">
            {editing ? "Update" : "Create"}
          </button>
          {editing && (
            <button type="button" className="btn-secondary" onClick={() => startEdit()}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--sand)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Reports</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-[var(--muted)]">{p.description}</div>
                </td>
                <td className="px-4 py-3">
                  {p.memberships.map((m) => m.user.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">{p._count?.reports ?? 0}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button type="button" className="text-[var(--accent)] underline" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button type="button" className="text-red-700 underline" onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
