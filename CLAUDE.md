# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read first: this is a newer Next.js

`AGENTS.md` warns that this Next.js (^16) has breaking changes from what you may know. Read the relevant guide in `node_modules/next/dist/docs/` (e.g. `01-app/01-getting-started/16-proxy.md`) before writing Next-specific code. One concrete example already in the repo: the old `middleware.ts` is now **`proxy.ts`** (exported function is `proxy`). Older `.env` comments still say "middleware" — they are stale.

## Commands

```bash
npm run dev          # next dev
npm run build        # next build (CI runs this after tests)
npm run lint         # eslint (flat config; .claude/** is ignored)
npm test             # vitest run  (all *.test.ts, node environment)
npm run test:watch   # vitest watch
npx vitest run lib/invoiceMath.test.ts           # single test file
npx vitest run -t "never drops a brand-new"      # single test by name
```

CI (`.github/workflows/ci.yml`, Node 20) runs `npm ci` → `npm test` → `npm run build`. It does not deploy: Vercel's Git integration deploys `develop` on push (a CI deploy-hook step was removed because it created a duplicate production deployment per push). `develop` is the working/deploy branch; `main` is the PR target.

Tests are colocated `*.test.ts` and only cover pure logic (no React/DOM, no network). The `@/` alias maps to the repo root. Env vars live in `.env` (gitignored); see the `process.env.*` usages in `lib/` for the full set (Supabase keys, `ADMIN_EMAILS`, `CRON_SECRET`, Razorpay, Resend, Upstash, VAPID, Instagram).

### Deploying: ask first, build locally first

Vercel's free (Hobby) plan caps **Deployment Storage at 10 GB**, cumulative across every retained deployment, and this project has exceeded it. Each deployment is roughly 80 MB, and every push to `develop` or to any branch creates one (previews included), so a deployment should be a deliberate act, not a side effect of working.

- **Never push or merge on your own** (a push to `develop` or any branch deploys). Ask the developer to deploy.
- **Before asking,** run `npm test` and `npm run build` locally and fix any errors. Only when both pass, tell the developer it is safe to deploy and let Vercel build.
- Don't leave stray `.next` or other build output in commits, and don't add large files to `public/` (use the Supabase buckets; `public/assets/pdfs`, and the `point1.obj` model are the known offenders).

## What this is

YAFT Designs: a marketing + training-business site (courses, services, labs, Tortoise plugin sales) with an admin back-office (leads, invoices, jobs, certificates, etc.). Next.js App Router + TypeScript + Supabase (Postgres/Auth/Storage), deployed on Vercel. Uses CSS Modules (no Tailwind).

The pre-migration static site was removed from the tree (see git history before this change if you need it). `public/` holds static assets.

## Architecture

### Supabase client tiers (`lib/supabase/`)
Pick the right one — they have very different privileges:
- `admin.ts` `getSupabaseAdmin()` — **service-role key, bypasses RLS**. Server-only. Used by nearly every API route and admin page. If the key is missing it silently falls back to the anon key (and logs), so writes fail rather than the app crashing.
- `public.ts` `getSupabasePublic()` — anon key, `cache: 'no-store'` fetch, for public reads in server components.
- `server.ts` `getSupabaseServer()` — cookie-bound SSR client, used to read the logged-in admin's session.
- `browser.ts` — client components.

Most tables are RLS-locked with no anon access; public writes go through API routes that use the service role. Schema is in `supabase/migrations/NNNN_*.sql` (sequential, ~80 files; there is no Supabase CLI config, so check the numbering and add the next number). Many migrations are security lockdowns — keep new tables RLS-enabled with grants revoked from `anon`/`authenticated` unless intentionally public.

### Admin auth is layered (don't rely on just one layer)
1. `proxy.ts` matches only `/admin/*` and `/api/admin/*`, checks the Supabase session email against `ADMIN_EMAILS` (`lib/admin.ts`), and delegates the allow/deny matrix to the pure, tested `lib/admin/proxyDecision.ts`. It fails closed for API routes if Supabase env is missing.
2. `app/admin/(dashboard)/layout.tsx` re-checks via `isRequestFromAdmin()` (defence in depth).
3. **Admin-only API routes that live outside `/api/admin/`** (e.g. `/api/invoices`, `/api/jobs`, `/api/clients`, `/api/team`) are NOT covered by the proxy matcher and must call `isRequestFromAdmin()` (`lib/admin/requireAdmin.ts`) themselves.

### Public routes, cron, and failure tolerance
- Public form endpoints (`/api/enquiries`, `/api/syllabus/access`, `/api/whatsapp/access`, …) validate input, rate-limit (`lib/rateLimit.ts` per-instance in-memory; `lib/rateLimitShared.ts` DB-backed via the `rate_limit_hit` RPC with in-memory fallback), upsert a lead (`lib/leads.ts`, keyed by email or LinkedIn URL, links the browser `session_id` to analytics events), then fire-and-forget email (Resend, `lib/email.ts`) and web push (`lib/webPush.ts`).
- If Supabase is down, enquiries/invoices are pushed to an **Upstash Redis queue** (`lib/queue.ts`) and replayed by `/api/cron/retry-queue`; persistent failures go to `sendAdminAlert`.
- Cron routes (`app/api/cron/*`, schedules in `vercel.json`) must stay **outside `/api/admin/`** (Vercel Cron has no session and always sends GET). They authenticate with `isAuthorizedCron` (`Bearer CRON_SECRET`, refuses if unset; most also accept a logged-in admin via `isRequestFromAdmin` for manual runs) and each is additionally gated by a row in `cron_job_controls` (`lib/cronControls.ts`, fails closed — a job is off unless explicitly enabled, optionally capped / limited to approved emails). New cron jobs must be added to both `vercel.json` and `CRON_JOBS`.
- Admin Server Components should read through `safeQuery`/`safeCount` (`lib/admin/safeQuery.ts`) so one failing query degrades to a fallback instead of 500ing the page.

### Domain areas
- **Marketing site**: `app/` public pages; course content comes from the `courses` table via `lib/courses.ts` (with a static-file → Supabase `syllabus` bucket mapping). Syllabus PDFs and the WhatsApp button are email/LinkedIn-gated (`CourseGateModal`, `WhatsAppGateModal`, `lib/syllabusAccess.ts`, `/api/syllabus/access`), and every gate/enquiry writes `analytics_events` (`lib/analytics.ts`, `AnalyticsTracker`, GA4 gated by the cookie-consent banner).
- **Course nav/enquiry options** are derived from one list (`app/courses/courseNav.ts`) — add new courses there so enquiry dropdowns don't drift (regression-tested).
- **Invoices**: totals in `lib/invoiceMath.ts`, PDF via pdfkit (`lib/invoicePdf.ts`, `pdfkit` is in `serverExternalPackages`), email/export/scheduled send, Indian financial-year logic in `lib/financialYear.ts`.
- **Jobs/clients/team**: admin-managed, shared with outsiders through tokenized read-only pages `/client-jobs/[token]` and `/team-jobs/[token]` (served by `/api/share/*`; `next.config.ts` sets `no-referrer`/`noindex` on them).
- **Tortoise (plugin licensing + sales)**: `lib/tortoise*.ts`, Razorpay checkout and `/api/razorpay/webhook` (test vs live mode via `RAZORPAY_MODE`), licence keys limited to `MAX_MACHINES_PER_KEY` machines, auto-generated tax invoice per INR sale.
- **Certificates**: issued from admin, public verify page + `/api/certificates/*`, PDF in `lib/certificatePdf.ts`.
- **Labs**: admin-uploaded Grasshopper/Rhino scripts with download/view counters.

### Redirects / headers (`next.config.ts`)
Old `.html` URLs and bare `yaftdesigns.com` permanently redirect to the clean `https://www.yaftdesigns.com` URLs (canonical host is `www`). A CSP is shipped in **report-only** mode — new third-party script/connect/frame origins need adding there.
