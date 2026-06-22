# YAFT Designs — Next.js + Supabase Migration Plan

Status: Phase 0 complete. Phase 1 code complete (API routes + schema written); blocked on two manual steps before it's live — see "Next manual steps" at the bottom.
Hosting target: Vercel
Current site: static HTML (`index.html`, `courses.html`, `services.html`, `faculty.html`), lead capture via Formspree, PDFs served directly from `assets/pdfs/`

## 1. Why migrate

Today's gate (email + LinkedIn modal before a syllabus PDF opens) is enforced entirely in client-side JS. Anyone who finds `assets/pdfs/rhino-architecture.pdf` can hit it directly and skip the modal completely — the gate is UX, not security. Moving to Next.js + Supabase fixes that by making the PDF unreachable until a server-side route validates the lead and hands back a short-lived signed URL. It also gets you real analytics (who viewed what, when, conversion from view → lead → enquiry) instead of Formspree's inbox, and lays groundwork for certificate issuance/verification later.

## 2. Target architecture

```
Next.js (App Router, TypeScript) — hosted on Vercel
  ├─ Marketing pages (/, /courses, /services, /faculty)         — server components, statically generated
  ├─ API routes (/app/api/**)                                    — serverless functions
  │   ├─ POST /api/leads               — record a lead (replaces Formspree)
  │   ├─ POST /api/syllabus/access      — validate lead, log access, return signed PDF URL
  │   ├─ POST /api/analytics/event      — record a page/interaction event
  │   ├─ POST /api/certificates/verify  — public, look up a certificate by code (Phase 2)
  │   └─ /api/admin/**                  — protected, issue certificates / view leads (Phase 2)
  └─ Supabase
      ├─ Postgres tables (see §3)
      ├─ Storage buckets: `syllabus-pdfs` (private), `certificates` (private)
      └─ RLS policies — anon can INSERT leads/events, cannot SELECT anything
```

Why this shape: the marketing pages don't need to be dynamic, so they stay fast and cheap (static generation). Only the three interactive bits — lead capture, gated PDF, analytics — touch the database, via API routes using the Supabase **service role** key (server-only, never shipped to the browser).

## 3. Database schema

All tables live in Supabase Postgres. `gen_random_uuid()` requires the `pgcrypto` extension (Supabase enables this by default).

### `courses`
Source of truth for course content, replacing the hardcoded cards in `courses.html`. Lets you edit course copy without a redeploy later (Phase 2+), but for the v1 migration this can just be a typed array in code — table is optional on day one. Listed here because the FK from `syllabus_requests`/`certificates` needs *some* stable identifier; a hardcoded `slug` string is fine until this table exists.

| column        | type        | notes                                  |
|---------------|-------------|-----------------------------------------|
| id            | uuid pk     | default `gen_random_uuid()`             |
| slug          | text unique | e.g. `rhino-architecture`               |
| title         | text        |                                          |
| tool          | text        | e.g. `Rhino3D`                          |
| level         | text        |                                          |
| duration      | text        |                                          |
| description   | text        |                                          |
| image_path    | text        | path in `assets` or a Storage bucket    |
| pdf_storage_path | text     | path inside `syllabus-pdfs` bucket      |
| active        | boolean     | default true                            |
| created_at    | timestamptz | default `now()`                         |

### `leads`
One row per person who has ever filled the gate form. Keyed by email so repeat visits update, not duplicate.

| column      | type        | notes                                      |
|-------------|-------------|---------------------------------------------|
| id          | uuid pk     | default `gen_random_uuid()`                 |
| email       | text unique | normalized lowercase                        |
| linkedin_url| text        |                                              |
| name        | text        | nullable — only the contact form collects this |
| first_seen  | timestamptz | default `now()`                             |
| last_seen   | timestamptz | default `now()`, bump on every new touch    |
| source      | text        | `syllabus_gate` \| `contact_form`           |

### `syllabus_requests`
Analytics + audit log: every time a lead unlocks/opens a specific course PDF. This is your "who's actually interested in what" signal — far more useful than the enquiry form alone, since most visitors unlock a PDF without ever submitting an enquiry.

| column       | type        | notes                                    |
|--------------|-------------|--------------------------------------------|
| id           | uuid pk     |                                              |
| lead_id      | uuid fk → leads.id |                                       |
| course_slug  | text        | matches `courses.slug`                      |
| requested_at | timestamptz | default `now()`                             |
| signed_url_expires_at | timestamptz | for debugging access issues        |

### `enquiries`
Replaces the Formspree contact form submissions, so they live next to everything else instead of an email inbox.

| column      | type        | notes                              |
|-------------|-------------|---------------------------------------|
| id          | uuid pk     |                                        |
| lead_id     | uuid fk → leads.id | nullable — direct enquiries may not have gone through the gate |
| name        | text        |                                        |
| email       | text        |                                        |
| course_interest | text   |                                        |
| message     | text        |                                        |
| created_at  | timestamptz | default `now()`                       |

### `analytics_events`
General-purpose event log — page views, modal opens, scroll depth, whatever you want to add later without a schema change. Keep it generic; don't make a table per event type.

| column      | type        | notes                                                    |
|-------------|-------------|-------------------------------------------------------------|
| id          | uuid pk     |                                                              |
| session_id  | text        | random UUID set in a cookie/localStorage on first visit    |
| lead_id     | uuid fk → leads.id | nullable — most events happen before a lead exists  |
| event_type  | text        | `page_view` \| `syllabus_modal_open` \| `syllabus_unlock` \| `enquiry_submit` \| ... |
| page        | text        | e.g. `/courses`                                             |
| course_slug | text        | nullable                                                    |
| meta        | jsonb       | freeform — referrer, UTM params, viewport, etc.             |
| created_at  | timestamptz | default `now()`                                             |

This is the table that gives you real funnel analytics: `page_view(/courses)` → `syllabus_modal_open` → `syllabus_unlock` → `enquiry_submit`, joinable by `session_id` and later `lead_id` once they convert.

### `certificates` (Phase 2 — build when you're ready to issue them)
| column          | type        | notes                                                |
|-----------------|-------------|---------------------------------------------------------|
| id              | uuid pk     |                                                          |
| certificate_code| text unique | short human-typeable code, e.g. `YAFT-2026-RA-0042`     |
| student_name    | text        |                                                          |
| email           | text        |                                                          |
| course_slug     | text        |                                                          |
| issued_at       | date        |                                                          |
| pdf_storage_path| text        | path in `certificates` bucket, or null if generated on the fly |
| status          | text        | `active` \| `revoked`                                   |
| issued_by       | text        | admin identifier, for audit                              |
| created_at      | timestamptz | default `now()`                                         |

### `certificate_verifications` (Phase 2, optional)
Log every public lookup against `/api/certificates/verify` — lets you see if someone's certificate is getting checked by an employer, and catch abuse (code enumeration attempts).

| column      | type        | notes              |
|-------------|-------------|----------------------|
| id          | uuid pk     |                      |
| certificate_code_attempted | text |                |
| matched     | boolean     |                      |
| ip_hash     | text        | hashed, not raw IP   |
| created_at  | timestamptz | default `now()`      |

### RLS policy summary
- `courses`: public SELECT (active rows only), no anon write.
- `leads`, `syllabus_requests`, `enquiries`, `analytics_events`: **no anon SELECT or UPDATE at all** — all reads/writes happen through API routes using the service-role key, which bypasses RLS. The anon/public key the browser holds should never be able to query these directly.
- `certificates`: no public SELECT (verification goes through the API route, which checks the code server-side and returns only a yes/no + minimal display fields, not the raw row).

## 4. API routes (v1 scope)

| Route | Method | Does |
|---|---|---|
| `/api/leads` | POST | Upsert into `leads` by email, returns `lead_id` |
| `/api/syllabus/access` | POST | Body: `{ email, linkedin, courseSlug }`. Upserts lead, inserts `syllabus_requests` row, calls `supabase.storage.from('syllabus-pdfs').createSignedUrl(path, 300)`, returns the signed URL. Client opens it immediately — link expires in 5 minutes so it can't be shared/scraped. |
| `/api/enquiries` | POST | Inserts into `enquiries`, replaces the Formspree form action |
| `/api/analytics/event` | POST | Fire-and-forget insert into `analytics_events`; called from a small client hook on page load and on key interactions |

Phase 2 adds `/api/certificates/verify` (public) and an `/api/admin/*` group behind Supabase Auth (magic link or password) for issuing certificates and viewing the leads/analytics dashboard.

## 5. What changes for the user-facing flow

Current: click "View syllabus" → client checks `localStorage` → if unlocked, `window.open(pdfUrl)` directly to a public file.

New: click "View syllabus" → if no valid unlock token cached client-side → show the same modal → on submit, `POST /api/syllabus/access` → server validates input, writes the DB rows, returns `{ url, expiresAt }` → client opens `url` and caches a short-lived "unlocked" flag (not the PDF URL itself, since it expires) so the *next* click skips straight to a fresh signed-URL request instead of re-showing the modal.

## 6. Suggested phases (fastest path to value first)

| Phase | Scope | Unlocks |
|---|---|---|
| **0 — Scaffold** | `create-next-app`, port the 4 HTML pages to App Router pages 1:1 (same CSS, same markup, minimal JSX changes) | Site runs on Next.js, deployable to Vercel, no behavior change yet |
| **1 — Supabase wiring** | Create project, run schema for `leads`, `enquiries`, `analytics_events`, `syllabus_requests`; build `/api/leads`, `/api/enquiries`, `/api/syllabus/access` (PDFs still in `/public` for now — just route the gate through the DB) | Real lead data in Postgres instead of Formspree; analytics events start flowing |
| **2 — PDF lockdown** | Move PDFs into a private Supabase Storage bucket, switch `/api/syllabus/access` to return signed URLs, delete the public copies from `/public` | Closes the direct-URL bypass — this is the actual security fix |
| **3 — Analytics dashboard** | Small `/admin` page (Supabase Auth–gated) querying `analytics_events` + `syllabus_requests` for a funnel view | You can see conversion without touching SQL manually |
| **4 — Certificates** | `certificates` table, issuance flow (manual insert or small admin form), public `/verify/[code]` page hitting `/api/certificates/verify` | Anyone with a certificate code can verify it; you control issuance |

Phases 0–2 are the "convert it and close the security gap" work the original ask was about. 3 and 4 are additive and don't block each other — you could do 4 before 3 if certificates become urgent.

## 7. Rough effort (AI-assisted, you reviewing/testing)

- Phase 0: ~1–2 hours — mostly mechanical (class→className, inline `<style>`→ either kept as a `<style>` tag in a layout or moved to a CSS file, vanilla JS → small client components for the nav toggle and the syllabus modal).
- Phase 1: ~2–3 hours — schema + 3 API routes + wiring the existing modal JS to call them instead of Formspree/localStorage.
- Phase 2: ~1 hour — bucket setup, swap signed-URL logic, delete public PDFs.
- Phase 3: ~2–3 hours if you want it to look decent, less if a plain table view is fine.
- Phase 4: ~3–4 hours depending on whether issuance is a manual SQL insert (fast) or a built admin form (slower but nicer).

Total for a usable, secured v1 (Phases 0–2): roughly half a day of focused work.

## 8. What I need from you to start

1. **A Supabase project.** Free tier is enough for this scale. Create one at supabase.com if you don't have one — I can't create the account for you, but once it exists I just need:
   - Project URL
   - `anon` public key (safe to put in client env vars)
   - `service_role` key (server-only — goes in Vercel's encrypted env vars, never committed to git)
2. **A Vercel account** linked to the GitHub repo, for deploys (can be done after Phase 0 — not needed to start coding).
3. **A decision on admin access for Phase 3/4** — magic-link email auth via Supabase Auth is the simplest (no password management) unless you have a preference.
4. Confirmation that it's fine to delete the public `assets/pdfs/*.pdf` files once Phase 2 lands (they'll exist only in private Storage afterward).

Nothing above blocks starting Phase 0 right now — that part is pure code. I'll begin scaffolding the Next.js app and porting `courses.html` first, then `index.html`, `services.html`, `faculty.html`, and pause for you to create the Supabase project before Phase 1.

## 9. Next manual steps (as of this update)

Phase 0 and the Phase 1 code are both done. Two things only you can do are blocking it from actually working end to end:

1. **Apply the migration.** Open the Supabase dashboard → SQL Editor for the `rjvadqwqgqouihuydlnu` project → paste in the contents of `supabase/migrations/0001_init.sql` → run it. This creates `courses`, `leads`, `syllabus_requests`, `enquiries`, `analytics_events`, `certificates`, `certificate_verifications` with RLS enabled.
2. **Paste the service_role key into `.env`.** Dashboard → Project Settings → API → reveal the `service_role` secret → set `SUPABASE_SERVICE_ROLE_KEY` in `.env`. This key is server-only — it's read by `lib/supabase/admin.ts` and never shipped to the browser, but it must never be committed (`.env` is already gitignored).

Until both are done, `/api/syllabus/access` degrades gracefully (PDFs are still public in Phase 1, so it just skips logging and serves the file). `/api/enquiries` does **not** degrade — without the service-role key, the contact form on every page will show "Could not save your enquiry" to real visitors, because Formspree was removed in favor of writing directly to the `enquiries` table. Don't consider this deployable until the key is in place and you've sent one test enquiry that shows up in the `enquiries` table.

## 10. Phase 3 — Admin dashboard (done)

`/admin` is now live, gated by Supabase Auth (email magic link, no password) plus an `ADMIN_EMAILS` allow-list checked in `middleware.ts` — anyone can request a magic link, but only emails in `ADMIN_EMAILS` get past the redirect. Pages:

- `/admin` — lead/enquiry/syllabus-request counts
- `/admin/leads` — every lead, by most recently active
- `/admin/enquiries` — every contact-form submission
- `/admin/analytics` — funnel counts (`page_view → syllabus_modal_open → syllabus_unlock → enquiry_submit`) and syllabus requests by course

All four query Supabase directly with the service-role key (`lib/supabase/admin.ts`), so they bypass RLS — that's safe only because `middleware.ts` already enforced the allow-list before the request reaches the page.

**Manual step required:** in the Supabase dashboard → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` (dev) and `https://yaftdesigns.com/auth/callback` (prod) to the redirect allow-list, or `signInWithOtp` will fail to bounce back into the app after the magic link is clicked.

## 11. Legacy site copied to `legacy-static/` (reference, not deployed)

`legacy-static/` holds an updated static-HTML snapshot (SEO meta tags, GA placeholder, a new `/resources` page, real workshop photos, nav tweaks) that was edited in parallel with this Next.js app. Everything in it has now been ported into the Next.js pages — `legacy-static/` itself is not built or deployed and can be deleted once you've confirmed the Next.js site has everything you need.
