# Deploy checklist (student)

## 1) Canonical public app repo
Public repo is live: https://github.com/r3s0lv343vr/pm-r3s0lv343vr (`main`).

To republish a clean app-only tree from this workspace:

```bash
./scripts/publish-clean-app-repo.sh
```

Historical export / one-time push notes:

```bash
git clone -b agent/pm-platform-phase1 https://github.com/r3s0lv343vr/pitch-rise-verification.git pm-tmp
cd pm-tmp
git remote remove origin
git remote add origin https://github.com/r3s0lv343vr/pm-r3s0lv343vr.git
git push -u origin agent/pm-platform-phase1:main
```

## 2) Database
1. Prefer claiming the temporary Prisma Postgres used during build (claim URL: https://create-db.prisma.io/claim?projectID=proj_r5nmgv30oxxosxgbhx9p3qcy&utm_source=create-db&utm_medium=cli (expires ~24h from creation)) OR create Neon/Supabase Postgres.
2. Copy the connection string into Vercel env as `DATABASE_URL`.
3. **Supabase + Vercel (required):** use the **Transaction pooler** (port **6543**), not Session mode (5432). Session pooler caps ~15 clients and will throw `EMAXCONNSESSION` / “max clients reached” under serverless concurrency.

```text
postgresql://postgres.<PROJECT_REF>:<URL_ENCODED_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

   - Encode special password characters (`@` → `%40`, `!` → `%21`).
   - Keep using the Session/direct URL locally for `prisma migrate` / `db push` if Transaction mode rejects migrations.

## 3) Vercel
1. Import `pm-r3s0lv343vr` (or this branch) in Vercel (account already linked).
2. Env vars:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` = your Vercel HTTPS URL
   - `NEXTAUTH_SECRET` = long random string
3. Deploy.
4. Locally against prod URL: `npx prisma migrate deploy` and `npm run db:seed`.

## 4) Cohort submission PR
From your machine (Cloud Agent cannot push to the fork):

```bash
git clone https://github.com/r3s0lv343vr/hult-cohort-program.git
cd hult-cohort-program
git fetch upstream projects/summer26/phase-1-project-1
git checkout -b participants/summer26/phase-1-project-1/r3s0lv343vr upstream/projects/summer26/phase-1-project-1
# add submissions/r3s0lv343vr-project-1.md from docs/SUBMISSION_DRAFT.md (update Production URL)
git add submissions/r3s0lv343vr-project-1.md
git commit -m "docs(submission): [Project 1] Submission — r3s0lv343vr"
git push -u origin participants/summer26/phase-1-project-1/r3s0lv343vr
# Open PR to rogerSuperBuilderAlpha/hult-cohort-program
# base: projects/summer26/phase-1-project-1
# title: [Project 1] Submission — r3s0lv343vr
```

Do **not** merge unless you decide to.

## 5) Sustained preview tunnel (Cloud Agent / local demo)

Quick `trycloudflare.com` URLs die when the process stops and change on restart.

This repo includes an auto-restart supervisor:

```bash
# from the runtime app directory (keeps cloudflared alive + writes PUBLIC_URL.txt)
./scripts/sustained-tunnel.sh 3000
```

- Current public URL is written to `PUBLIC_URL.txt` (gitignored) and synced into `.env` as `NEXTAUTH_URL`.
- Restart Next after a URL change so Auth.js picks up the new host.
- For a **stable** HTTPS hostname that does not rotate, use **Vercel** (steps 1–3 above) or a **named Cloudflare Tunnel** on a domain you control (requires Cloudflare login + DNS).
