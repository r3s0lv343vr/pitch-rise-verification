"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

const demos = [
  { email: "admin@hult-cohort.test", label: "Admin" },
  { email: "pm@hult-cohort.test", label: "PM" },
  { email: "member@hult-cohort.test", label: "Member" },
  { email: "viewer@hult-cohort.test", label: "Viewer" },
  { email: "staff-review@hult-cohort.test", label: "Staff" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("pm@hult-cohort.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#12365f_0%,_#020617_55%)] px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-white">Log in</h1>
        <p className="mt-1 text-sm text-slate-400">Email + password auth for the cohort PM platform.</p>
        {params.get("registered") ? (
          <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Account created. Sign in to continue.
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">One-click demo accounts</p>
          <div className="flex flex-wrap gap-2">
            {demos.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("password123");
                }}
                className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200"
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Demo password: <code>password123</code></p>
        </div>
        <p className="mt-5 text-sm text-slate-400">
          No account?{" "}
          <Link href="/signup" className="text-cyan-300 hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
