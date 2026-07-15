# Project Intelligence Platform

## Repository note

This Cloud Agent workspace is bound to `pitch-rise-verification` for git push permissions. Pitch Rise verification files are preserved under `verifications/` and `docs/pitch-rise-verification/`.

**Preferred final home:** create public repo `r3s0lv343vr/pm-r3s0lv343vr` and push this codebase there (or transfer). Do not treat this as replacing your verification history on `main` permanently — app work lives on branch `agent/pm-platform-phase1` until migrated.

**Hult Cohort · Project 1 — PM platform** by [`@r3s0lv343vr`](https://github.com/r3s0lv343vr)

An AI-native project management foundation for a ~30 person cohort: multi-user auth, projects, tasks, assignments, status workflows, budgets, risks, and views that make the next ship action obvious.

## Production URL

_Pending Vercel deploy — will be filled after HTTPS is live._

## Stack / hosting

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Auth.js (NextAuth)** email/password
- **Prisma + PostgreSQL** (persist across redeploys)
- **Vercel** for HTTPS hosting

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
- Stub integrations: Slack, Email, Calendar, GitHub
- Dashboard “next action” + portfolio reports

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
4. Deploy — build runs `prisma generate`
5. Run migrations against production: `npx prisma migrate deploy` (local with prod URL) then `npm run db:seed` once

## Architecture

```
Browser → Next.js (Vercel)
            ├─ Auth.js (JWT sessions)
            ├─ Server Actions (mutations)
            └─ Prisma → PostgreSQL
```

Roles gate create/edit for projects, tasks, budgets, risks, and integrations.

## Known limitations

- Integration Connect buttons are UI stubs (no real OAuth/API calls yet)
- No native mobile apps (responsive web only)
- Email reminders / push notifications not shipped
- AI Digital Twin / Time Machine are roadmap Phase 2+, not this ballot week
- Temporary Prisma Postgres claim may expire unless claimed into a permanent project

## License

MIT
