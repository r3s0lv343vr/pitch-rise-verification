import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, Mail, Network, Shield } from "lucide-react";
import { getOptionalSession } from "@/lib/session";
import { redirect } from "next/navigation";

const CONTACT_EMAIL = "hello@project-intelligence.demo";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.35-1.29-1.71-1.29-1.71-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.23 0Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.78 7.75L23.25 22h-6.55l-5.13-6.7L5.7 22H2.58l7.25-8.29L.75 2h6.72l4.63 6.14L18.9 2Zm-1.15 18h1.82L6.36 3.9H4.41L17.75 20Z" />
    </svg>
  );
}

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com/r3s0lv343vr",
    icon: GitHubIcon,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/",
    icon: LinkedInIcon,
  },
  {
    name: "X",
    href: "https://x.com/",
    icon: XIcon,
  },
];

export default async function HomePage() {
  const session = await getOptionalSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_#12365f_0%,_#020617_50%)] text-slate-100">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-10">
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

      <footer className="border-t border-slate-800/80 bg-slate-950/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Project Intelligence Platform</div>
            <p className="mt-1 text-sm text-slate-400">Built for Hult Cohort collaboration and shipping.</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200 hover:underline"
            >
              <Mail className="h-4 w-4" />
              {CONTACT_EMAIL}
            </a>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Follow us</p>
            <div className="flex items-center gap-3">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.name}
                    title={item.name}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-200"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
