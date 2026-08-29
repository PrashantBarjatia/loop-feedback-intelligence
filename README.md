# LOOP — AI Customer-Feedback Intelligence Platform

Built for the Zidio Development internship brief ("Project LOOP"). A multi-tenant
web app that ingests customer feedback, classifies it with Claude, clusters it
into themes, detects trends, answers questions grounded in real feedback, and
generates a Voice-of-Customer report.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth (Auth.js) with credentials login
- Tailwind CSS + Recharts
- Anthropic Claude API (`claude-sonnet-4-6`) for all AI features
- Zod for request validation

## One deliberate simplification (read this before your mentor call)

The brief suggests **pgvector or a hosted embeddings provider** for "Ask LOOP"
semantic search. To keep this buildable solo in 4 weeks without provisioning a
Postgres extension or a second paid API key, `lib/search.ts` implements a
lightweight **TF-IDF-style keyword vector + cosine similarity, computed in
plain JavaScript**, and stores it as JSON in the `Embedding` table instead of
a real vector column.

The **pattern is identical** to the "real" version: embed on ingest → store →
retrieve top-K → pass only those items to Claude → Claude answers only from
what it was given. If asked, explain it exactly like that — it's a legitimate,
documented trade-off, not something you missed. Swapping in real embeddings
later would only mean rewriting `lib/search.ts`; nothing else changes.

## 1. Prerequisites

- Node.js 18+ and Git
- A free PostgreSQL database — [Neon](https://neon.tech) or [Supabase](https://supabase.com) both work
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- (Optional, for deploying) A [Vercel](https://vercel.com) account

## 2. Local setup

```bash
# 1. Unzip the project, then from inside the folder:
npm install

# 2. Copy the env template and fill in your real values
cp .env.example .env
# Edit .env:
#   DATABASE_URL      -> from Neon/Supabase (connection string)
#   NEXTAUTH_SECRET   -> run: openssl rand -base64 32
#   NEXTAUTH_URL      -> http://localhost:3000
#   ANTHROPIC_API_KEY -> your Claude API key

# 3. Create the database tables
npx prisma migrate dev --name init

# 4. Load demo data (1 workspace, 3 users, 130 feedback items)
npm run seed

# 5. Run it
npm run dev
```

Open **http://localhost:3000** — you'll be redirected to `/login`.

## 3. Demo logins (created by the seed script)

All three use the same password: `Password123!`

| Role    | Email               |
|---------|---------------------|
| Admin   | admin@acme.demo     |
| Analyst | analyst@acme.demo   |
| Viewer  | viewer@acme.demo    |

## 4. How to test each feature (do this yourself before the mentor call)

**Auth & tenant isolation (M1)**
1. Log in as `admin@acme.demo`. You land on the Dashboard.
2. Sign up a *second, brand-new* workspace (different email) at `/signup`.
3. Confirm the new workspace's Inbox is empty — it must never show Acme's 130
   seeded items. This proves tenant isolation (the brief's non-negotiable rule).

**RBAC (C2)**
1. Log in as `viewer@acme.demo`. Confirm you **cannot** add feedback, upload
   CSVs, change status, or add members (buttons are hidden, and the API
   returns 403 if you hit it directly — try `curl` or Postman to prove this
   to your mentor).
2. Log in as `analyst@acme.demo`. Confirm you can ingest/triage feedback but
   `/settings` shows no "Add member" form (admin-only).

**Feedback ingestion (C3)**
1. As Admin or Analyst, go to Inbox → type a sentence → Add. Watch it appear
   tagged with sentiment + a theme within a few seconds (that's a live Claude
   call — needs `ANTHROPIC_API_KEY` set).
2. Upload `sample-feedback.csv` (included in this repo) via "Bulk import CSV".
   Confirm the imported/failed counts shown match the file.
3. Click a "Simulate channel" button and confirm new items appear.

**Inbox (C4)**
1. Search for a keyword, filter by sentiment/status, and page through results.
2. Change an item's status NEW → REVIEWED → ACTIONED inline.

**Dashboard (C5)**
1. Confirm the three charts (volume, sentiment, top themes) update after you
   add feedback.

**AI1 — Classification**
1. Add a clearly negative sentence ("This crashes every time, unacceptable").
   Confirm it lands as NEGATIVE with a sensible theme.
2. Click "Re-classify" on any item to confirm the manual override works.

**AI2 — Theme clustering & trends**
1. Go to Trends. Click a theme to drill into its underlying feedback.
2. Add 3+ items that clearly belong to one theme in a short window, then
   check that theme's "spiking" flag / % change.

**AI3 — Ask LOOP**
1. Go to Ask LOOP, ask: *"What are users saying about onboarding?"*
2. Confirm the answer lists source items (`[1]`, `[2]`...) and that those
   sources are real rows from your Inbox — nothing invented.
3. Ask something with **no** matching data (e.g. "What do users think about
   our physical office?") and confirm it says it can't find an answer,
   rather than making one up.

**AI4 — Voice-of-Customer report**
1. Go to Reports → "Generate report (last 7 days)".
2. Confirm the numbers (theme counts, sentiment breakdown) match what you'd
   expect from your own recent test data, and read the narrative Claude wrote
   around them.
3. Use your browser's Print → Save as PDF to export it (the brief accepts a
   shareable page as the export method too).

## 5. Deploying (for your submission link)

```bash
npm install -g vercel
vercel
```

Set the same four environment variables in the Vercel project dashboard
(Settings → Environment Variables), then trigger a redeploy so they take
effect. Point `DATABASE_URL` at your cloud Postgres (same one you migrated
locally, or a fresh one — just run `npx prisma migrate deploy` and
`npm run seed` against whichever one is live).

## 6. Project structure

```
loop/
  app/
    (auth)/login, signup
    (app)/dashboard, inbox, trends, ask, reports, settings
    api/
      auth/          NextAuth + signup
      feedback/      CRUD, CSV upload, simulate channel, re-classify
      themes/        theme list + trend/spike detection
      insights/ask/  retrieval-grounded Q&A
      reports/       Voice-of-Customer report generation
      members/       admin-only invite/list
  components/        Sidebar, StatCard, Providers
  lib/
    ai.ts            every Claude API call lives here
    search.ts        retrieval for Ask LOOP (see simplification note above)
    auth.ts          NextAuth config + requireSession/requireRole guards
    db.ts            Prisma client singleton
    validations.ts   Zod schemas for every API input
  prisma/
    schema.prisma    data model
    seed.ts          demo workspace + users + 130 feedback items
  sample-feedback.csv  for testing bulk import
```

## 7. Known limitations (be upfront about these if asked)

- Semantic search is TF-IDF/cosine in JS, not real embeddings (see above).
- CSV rows are classified sequentially, not queued — fine for a demo-sized
  file, would need a job queue at real production scale.
- No automated tests included (listed as an optional stretch goal in the brief).
