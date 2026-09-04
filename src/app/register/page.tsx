"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    };
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Registration failed");
      return;
    }
    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    router.push("/reports");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card-panel mx-auto mt-16 w-full max-w-md space-y-4">
      <div>
        <h1 className="page-title">Create account</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">New accounts join as Team Member</p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Name</span>
        <input name="name" required className="field" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Email</span>
        <input name="email" type="email" required className="field" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Password</span>
        <input name="password" type="password" minLength={8} required className="field" />
      </label>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creating…" : "Register"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        Already registered?{" "}
        <Link href="/login" className="text-[var(--accent)] underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
