import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdmin, isManagerOrAdmin } from "@/lib/rbac";

export async function AppNav() {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role;
  const links = [
    { href: "/reports", label: "My reports", show: true },
    { href: "/reports/new", label: "New report", show: true },
    { href: "/dashboard", label: "Team dashboard", show: isManagerOrAdmin(role) },
    { href: "/projects", label: "Projects", show: isManagerOrAdmin(role) },
    { href: "/users", label: "Users", show: isAdmin(role) },
  ].filter((l) => l.show);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]">
            WeekPulse
          </Link>
          <nav className="flex flex-wrap gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] transition hover:bg-[var(--sand)] hover:text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <div className="font-medium text-[var(--ink)]">{session.user.name}</div>
            <div className="text-xs text-[var(--muted)]">{session.user.role.replace("_", " ")}</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--ink)] hover:bg-[var(--sand)]"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
