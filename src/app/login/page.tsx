"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card-panel mx-auto mt-16 w-full max-w-md space-y-4">
      <div>
        <h1 className="page-title">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">WeekPulse weekly reporting</p>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Email</span>
        <input name="email" type="email" required className="field" placeholder="sam@weekly.app" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted)]">Password</span>
        <input name="password" type="password" required className="field" />
      </label>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href="/register" className="text-[var(--accent)] underline">
          Register
        </Link>
      </p>
      <p className="rounded-md bg-[var(--sand)] px-3 py-2 text-xs text-[var(--muted)]">
        Demo: manager@weekly.app / sam@weekly.app — password Password123!
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
