"use client";

import { FormEvent, useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  _count?: { reports: number };
  projectMemberships?: { project: { id: string; name: string } }[];
};

type Project = { id: string; name: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "TEAM_MEMBER",
  });

  async function load() {
    const [u, p] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    if (u.error) setError(u.error);
    setUsers(u.users || []);
    setProjects(p.projects || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "TEAM_MEMBER" });
    await load();
  }

  async function updateRole(id: string, role: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Update failed");
      return;
    }
    await load();
  }

  async function assignProjects(id: string, projectIds: string[]) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectIds }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
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
        <h1 className="page-title">User management</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Invite teammates and assign roles</p>
      </div>

      <form onSubmit={invite} className="card-panel grid gap-3 md:grid-cols-2">
        <h2 className="section-title md:col-span-2">Invite user</h2>
        {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
        <input
          className="field"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="field"
          placeholder="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="field"
          placeholder="Temporary password"
          type="password"
          minLength={8}
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          className="field"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="TEAM_MEMBER">Team Member</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit" className="btn-primary md:col-span-2 w-fit">
          Invite
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--sand)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Reports</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const selected = new Set(u.projectMemberships?.map((m) => m.project.id) || []);
              return (
                <tr key={u.id} className="border-t border-[var(--border)] align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-[var(--muted)]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="field-sm"
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                    >
                      <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs space-y-1">
                      {projects.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(p.id);
                              else next.delete(p.id);
                              assignProjects(u.id, Array.from(next));
                            }}
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{u._count?.reports ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-red-700 underline"
                      onClick={() => remove(u.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
