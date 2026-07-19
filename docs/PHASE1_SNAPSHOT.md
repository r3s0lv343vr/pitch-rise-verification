# Phase 1 WIP — Site Snapshot

**Status:** Phase 1 is **not complete**, but everything built on the site so far is preserved.

**Snapshot date:** 2026-07-17  
**Branch:** `agent/pm-platform-phase1`  
**Tag:** `phase-1-wip-site-snapshot`  
**Commit (site layout/code):** `8d31b73`

## What is kept

- Command Center: Overview, Kanban, Process Workflow Map, Gantt Chart-Calendar (linked status model)
- Downtime correlation on Overview + waste hotspot on Process Workflow Map
- My Work: Personal Overview (clock in/out, daily brief, reminders, priority, impact) + Assignments tab
- Auth, projects/tasks, budgets/risks stubs, seeded demo accounts
- Pitch Rise verification files remain under `verifications/` and `docs/pitch-rise-verification/`

## Demo login

- Email: `pm@hult-cohort.test`
- Password: `password123`

(Other seeded users also use `password123`.)

## How to keep developing without losing this

1. Leave this branch/tag alone as the frozen “good so far” point.
2. Create a new branch from it for more Phase 1 work:

```bash
git fetch origin
git checkout agent/pm-platform-phase1
git checkout -b agent/pm-platform-phase1-continued
```

3. Or restore this exact site state later:

```bash
git fetch origin
git checkout phase-1-wip-site-snapshot
```

## Notes

- Cloudflare preview URLs expire; GitHub is the durable copy of the code.
- After database reseeds, sign out and sign back in so assignments match your user.
- For a permanent public demo later: claim a lasting DB + deploy to Vercel (see `docs/DEPLOY_CHECKLIST.md`).
