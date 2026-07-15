# Deploy checklist (student)

## 1) Create the preferred public app repo
1. On GitHub (logged in as `r3s0lv343vr`): **New repository** → name `pm-r3s0lv343vr` → Public → MIT → create (empty, no README if possible).
2. Push this branch’s code there:

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
