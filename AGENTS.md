# Project Intelligence Platform — Agent notes

## Product
Hult Cohort Project 1 PM platform for `@r3s0lv343vr`.
Baseline ballot features + complex PM surfaces (Kanban/Gantt/map, budgets, risks) and motivation UX.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Auth.js (NextAuth) credentials provider (email/password)
- Prisma ORM + PostgreSQL
- Deploy target: Vercel

## Agent workflow used
1. Research: Hult `project-1-pm-platform` requirements + submission PR conventions
2. Dev: scaffold app, schema, seed (≥30 users), RBAC, views, actions
3. QA: `npm run build`, seed, local smoke of auth → project → task → assign → status

## Key paths
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — demo + staff + cohort accounts
- `src/lib/auth.ts` — authentication
- `src/app/actions.ts` — mutations
- `src/app/(app)/**` — authenticated UI

## Do not
- Commit `.env`
- Merge the cohort submission PR unless the student asks
- Start Phase 2 Digital Twin work until instructed
