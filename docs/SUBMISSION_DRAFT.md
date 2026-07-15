# Project 1 Submission — @r3s0lv343vr

## Summary
Project Intelligence Platform — Phase 1 cohort PM system with multi-user auth, projects/tasks/assignments, Kanban/Gantt/map, budgets, risks, RBAC, and motivation dashboard.

## Production URL
Pending Vercel HTTPS deploy (student to import GitHub repo and set env). Interim code branch: https://github.com/r3s0lv343vr/pitch-rise-verification/tree/agent/pm-platform-phase1

## Setup steps verified on fresh clone
1. `git clone` + checkout `agent/pm-platform-phase1`
2. `cp .env.example .env` and set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
3. `npm install`
4. `npx prisma migrate deploy`
5. `npm run db:seed`
6. `npm run build` (verified in clean clone)
7. `npm run dev` or `npm start`

## Architecture summary
Next.js 15 App Router + Auth.js credentials + Prisma/PostgreSQL on Vercel. Server Actions for mutations; JWT sessions; role matrix Admin/PM/Member/Viewer.

## Motivation / engagement design notes
Dashboard highlights portfolio progress, open risks, and a personal "next action." My Work surfaces blockers first. Project map shows phase→milestone→task completion paths so classmates always see what to ship next.

## Known limitations
Integration connect buttons are stubs; no native mobile app; email reminders not shipped; AI Digital Twin deferred to later phases; temporary Prisma Postgres should be claimed for permanence; preferred app repo `pm-r3s0lv343vr` pending creation (Cloud Agent could only push to pitch-rise-verification).

## Agent usage summary
Cursor agent researched Hult Project 1 requirements, implemented the full Phase 1 platform, seeded 33 users, verified build + auth smoke + fresh-clone build. Deploy/PR pending student GitHub repo creation + Vercel env.

## Agent usage
- Research: Hult cohort PM requirements/rubric; Prisma Postgres; Auth.js
- Dev: Next.js PM app, schema, seed, RBAC, complex views
- QA: local production smoke + clean-clone `npm install` / migrate / build

## Test plan
- [x] Fresh clone install + build
- [x] Login with seeded PM account
- [x] Dashboard shows seeded project
- [ ] Production HTTPS returns 200 after Vercel deploy
- [ ] Reviewer signup + create/assign task on production
