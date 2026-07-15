import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, Network, Shield } from "lucide-react";
import { getOptionalSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getOptionalSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#12365f_0%,_#020617_50%)] text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-sm font-semibold tracking-wide text-cyan-200">Project Intelligence</div>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/60">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Hult Cohort · Project 1 PM Platform
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Record the past. Understand the present. Ship what&apos;s next.
          </h1>
          <p className="mt-5 text-lg text-slate-300">
            A production project-management system built for a 30-person cohort: accounts, projects, tasks,
            assignments, budgets, risks, and views that make progress impossible to ignore.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Create your account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-5 py-3 text-sm text-slate-200 hover:bg-slate-800"
            >
              Use a demo login
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CheckCircle2,
              title: "Baseline PM",
              text: "Projects, tasks, status workflows, and assign-by-email/username.",
            },
            {
              icon: Network,
              title: "Complex views",
              text: "Kanban, Gantt, and phase→milestone→task project maps.",
            },
            {
              icon: Gauge,
              title: "Motivation UX",
              text: "Next actions, blockers, budget burn, and my-work urgency.",
            },
            {
              icon: Shield,
              title: "Roles that matter",
              text: "Admin / PM / Member / Viewer with real permission gates.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
              <item.icon className="mb-3 h-5 w-5 text-cyan-300" />
              <div className="font-medium text-white">{item.title}</div>
              <p className="mt-2 text-sm text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
