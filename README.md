# Project Intelligence Platform

**Hult Cohort · Project 1 — PM platform** by [`@r3s0lv343vr`](https://github.com/r3s0lv343vr)

An AI-native project management foundation for a ~30 person cohort: multi-user auth, projects, tasks, assignments, status workflows, budgets, risks, and views that make the next ship action obvious.

## Production URL

https://pm-r3s0lv343vr.vercel.app

Canonical source repo: [`r3s0lv343vr/pm-r3s0lv343vr`](https://github.com/r3s0lv343vr/pm-r3s0lv343vr) (`main`).

Fallback / historical Cloud Agent branch (kept; do not delete for review-week links):
[`pitch-rise-verification` / `agent/pm-platform-phase1-continued`](https://github.com/r3s0lv343vr/pitch-rise-verification/tree/agent/pm-platform-phase1-continued)
— that branch also carries Pitch Rise `verifications/` history unrelated to the PM app.

## Stack / hosting

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Auth.js (NextAuth)** email/password
- **Prisma + PostgreSQL** — on Vercel use Supabase **Transaction pooler** (`:6543`, `pgbouncer=true`)
- **Vercel** for HTTPS hosting (`pm-r3s0lv343vr`)

## Features (Phase 1)

### Ballot baseline
- Sign up / log in (open registration)
- ≥30 accounts supported (seed includes 33 users)
- Projects: create / edit / archive
- Tasks: title, description, status (≥3), assignee
- Assign by **email or username**
- Filter tasks by assignee, status, project
- Data persists in Postgres across refresh/redeploy

### Complex PM + motivation
- Onboarding wizard
- Kanban, Gantt, project map (phases → milestones → tasks)
- Overall budget + milestone sub-budgets + resource allocations
- Risks, issues, change requests
- Role-based access: Admin / PM / Member / Viewer
- **Stub** integrations (UI only): Slack, Email, Calendar, GitHub
- Dashboard “next action” + portfolio reports (Trend Analysis + Insights)

## Demo accounts

Password for all seeded users: `password123`

| Email | Role |
|-------|------|
| `admin@hult-cohort.test` | Admin |
| `pm@hult-cohort.test` | PM |
| `member@hult-cohort.test` | Member |
| `viewer@hult-cohort.test` | Viewer |
| `staff-review@hult-cohort.test` | Staff Admin |

Also seeded: `student1@hult-cohort.test` … `student28@hult-cohort.test`.

## Setup (fresh clone)

```bash
git clone https://github.com/r3s0lv343vr/pm-r3s0lv343vr.git
cd pm-r3s0lv343vr
cp .env.example .env
# Set DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
# Supabase on Vercel: Transaction pooler :6543 + pgbouncer=true (not Session :5432)
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000

### Production (Vercel)

1. Create/claim a Postgres database (Neon, Supabase, Prisma Postgres, etc.)
2. Import this GitHub repo into Vercel
3. Set env vars: `DATABASE_URL`, `NEXTAUTH_URL` (your HTTPS URL), `NEXTAUTH_SECRET`
4. For Supabase + Vercel, `DATABASE_URL` must be the **Transaction** pooler (`aws-0-<region>.pooler.supabase.com:6543?...&pgbouncer=true&connection_limit=1&sslmode=require`). Session mode (`:5432`) will hit `EMAXCONNSESSION` under serverless concurrency.
5. Deploy — build runs `prisma generate`
6. Run migrations against production: `npx prisma migrate deploy` (local with a direct/session URL if needed) then `npm run db:seed` once

## Architecture

```
Browser → Next.js (Vercel)
            ├─ Auth.js (JWT sessions)
            ├─ Server Actions (mutations; see src/server/actions/*)
            └─ Prisma → PostgreSQL (Transaction pooler in production)
```

Roles gate create/edit for projects, tasks, budgets, risks, and integrations.

## Known limitations

- Integration Connect buttons are **non-functional stubs** (no real OAuth/API calls; local Connected flag only)
- No native mobile apps (responsive web only)
- Email reminders / push notifications not shipped
- AI Digital Twin / Time Machine are roadmap Phase 2+, not this ballot week

## License

MIT
