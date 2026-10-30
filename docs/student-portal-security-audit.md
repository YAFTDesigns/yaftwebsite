# Student portal: security and privacy audit

Scope: /student, /api/student/*, /api/admin/training, /api/admin/student-projects, the claim, link, upload, certificate and publishing flows, and the changes to /api/enroll/order and the auth callback. Method: code review against OWASP ASVS / API Security Top 10 themes, database tests on synthetic data inside rolled-back transactions, Supabase security advisor, and unit tests. Date: 2026-10-31.

Not verified items are listed at the end. Nothing here was tested with real charges, refunds, messages or certificates.

## Baseline (before the build)

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| B1 | High | Admin auth | Admin gate was email-allow-list only. An unverified signup using an allow-listed address could have passed once students could sign up. | Fixed: `isAdminUser` needs allow-listed email AND `email_confirmed_at`, in proxy, requireAdmin and adminEmail. Tested. |
| B2 | Medium | Supabase Auth | Leaked-password protection is off (advisor). | Open. Dashboard toggle, owner action. Students mostly use Google or email link, so exposure is small. |
| B3 | Medium | Storage | Buckets for site assets are public (by design). No private bucket existed for student files. | Fixed: private `student-private` bucket (not public, 25 MB cap), accessed only by 60 s signed links after an ownership check. |
| B4 | Medium | Auth callback | Always redirected to /admin, no safe `next`. | Fixed: allow-list of `/student` and `/admin` only. |
| B5 | Medium | Environments | Preview and production share one Supabase project. | Open, residual risk. Mitigated: previews never send real emails; portal tables are additive. |
| B6 | Low | Headers | CSP is report-only. | Open. Portal origins already covered. Enforce after a review window. |
| B7 | Low | Config | Unused Gmail env vars remain. | Open, owner cleanup. |

## Findings from this build

| # | Severity | Area | Finding | Evidence (redacted) | Fix | Retest |
|---|----------|------|---------|---------------------|-----|--------|
| F1 | Low | Database | Advisor: trigger function `project_revision_guard` had a mutable `search_path`. | advisor `function_search_path_mutable` | Migration 0085 pins `search_path`. | Re-run advisor after deploy: expected clear. |
| F2 | Info | Database | Advisor lists "RLS enabled, no policy" on portal tables. | advisor `rls_enabled_no_policy` | Intended: deny-all for browser roles, service role only via server routes. Verified anon and authenticated get `insufficient_privilege`. | T4a-c passed. |

No Critical or High findings open from this build.

## Controls and how they were checked

- **Identity comes only from the verified session.** `getStudentSession()` requires a confirmed email; no route accepts a student id from the browser. Verified by code review of every /api/student route.
- **Data isolation.** Every read is scoped by the signed-in student's id (enrolment links, bills, projects, certificates, testimonials, files). Bill PDF and certificate PDF return 404 (not 403) for someone else's id. File paths must start with the student's own folder. DB tests: one plan cannot have two owners (T1 passed); browser roles cannot read portal tables (T4 passed). Two-real-accounts end-to-end test: **Not verified** (needs two real sign-ins).
- **Account linking.** Historical payments are never attached because an email matches. Verified-email match shows a confirm step. Other-email claims need a link sent to the billing address on the payment: 43-char random token, SHA-256 hash stored, 72 h expiry, single use, 5 failed tries lock it. Request endpoint returns the same message whether or not the payment exists. Ambiguous or conflicting cases go to admin review. Unit tests cover the token rules.
- **Changing email does not move enrolments** (ownership is the student id, not the email).
- **CSRF.** Every state-changing student/admin portal route checks the Origin against the host (tested); cookies are SameSite=Lax.
- **Rate limits** (shared, DB-backed) on link, claim request, claim redeem, uploads, testimonials, certificate verify.
- **Uploads.** Images are decoded, format checked, metadata stripped and re-encoded to WebP with a pixel cap. Private files accepted only as PDF, ZIP or Rhino 3DM by magic bytes; 25 MB cap; no SVG/HTML accepted. Stored in a private bucket under random names. A **malware scan is not performed**: residual risk; files are only opened by admins from signed links, never rendered by the site.
- **XSS.** All student text is cleaned of control/bidi characters and rendered as React text. Links must be public https URLs (no javascript:, data:, credentials, IPs, localhost). Admin review shows links with rel=noopener noreferrer nofollow.
- **CSV/spreadsheet injection.** `csvCell` prefixes formula characters; tested.
- **SSRF.** The only server-side fetch of a user-influenced URL is the Google profile picture on testimonial approval: https only, host must end in googleusercontent.com, redirects refused, 8 s timeout, 5 MB cap.
- **Payments untouched.** No change to prices, combos, GST, FX, bill numbers, reconciliation or FY reports. Portal reads existing plans, payments, bills and credit notes; "paid" and "balance" come from the same schedule code as the pay page. Signed-in checkout only inserts a link row; guest checkout is unchanged. A started-but-unpaid checkout is shown as "Pending checkout" and is not an active enrolment (no projects, no certificate, not in totals).
- **Certificates.** Only after an approved project, plus full payment where the course rule says so (default: required, **owner to confirm**). Unique index prevents a duplicate live certificate per enrolment and course (T3 passed). Verification token is 128-bit, public view shows only valid/revoked, name, course, date and id; rate limited, no-store, noindex, no-referrer. Revoke and reissue are admin-only and audited.
- **Approved work is immutable** at database level (T2 passed); edits create a new revision.
- **Publishing.** Only approved items with recorded consent; private files never copied to public storage; withdrawal removes the public row and records a withdrawal consent row.
- **Admin.** All Training endpoints require an allow-listed AND email-verified admin, check Origin on writes, and write to the audit log. There is no "mark as paid" action anywhere in the portal.
- **Audit log.** `portal_audit_events` records links, claims, profile changes, submissions, reviews, certificate issue/revoke/reissue, publishing and withdrawals. No tokens, passwords or payment data are written.
- **Headers/caching.** /student: no-store, noindex, no-referrer (claim and verify tokens live in its URL). API responses with personal data are no-store.
- **Secrets** were never printed or logged.

## Vercel "Require Log In" / deployment protection

Not changed. Standard protection was disabled earlier so Razorpay webhooks reach previews. If re-enabled for previews it must exclude webhook and cron paths and must not block students or the Google/Supabase OAuth return. **Not verified** (needs the Vercel dashboard); owner decision.

## Privacy notes (for the owner's privacy notice and policies)

- **Data held per student:** auth identity (email, Google name and picture if used), display name, certificate name, optional phone, optional avatar/testimonial photo, enrolment links to existing payment plans, project drafts and files, testimonial text, consent records, audit entries.
- **Processors:** Supabase (database, auth, storage), Vercel (hosting), Google (sign-in; basic profile only: openid, email, profile), Resend (email), Razorpay (payments, existing).
- **Consent per purpose, with version and time:** project publication, testimonial text, testimonial photo, course-interest tracking (default OFF; switching off deletes saved events). Withdrawal is a new row. Browsing is never marketing consent. No hidden tracking was added.
- **Testimonial photo:** if no photo is uploaded the Google picture is used; the form states this before submit and offers "no photo".
- **Financial records** (bills, payments, credit notes, FY reporting) are retained as the accounting law requires and are not deleted by portal deletion.
- **Needs owner decisions before wide launch:** retention periods (inactive accounts, drafts, abandoned checkouts, rejected submissions); whether under-18 students are accepted and if so parental consent; export and deletion request process (suggested: email request, 30 days); privacy notice wording for the above.
- **Not built:** self-service data export and account deletion buttons (handled by email request for now).

## Monitoring and incidents

Errors log with a `[student-*]` or `[portal-audit]` prefix in Vercel logs. Suggested alerts: spikes of 429s on claim endpoints, repeated `claim_link_requested` for one plan, any `certificate_revoked`. Incident steps: revoke affected claim tokens (delete rows in `enrolment_claims`), revoke certificates from Admin > Training, rotate keys if exposed. Migrations 0082 to 0085 are additive with rollback scripts in `supabase/rollback/`.

## Not verified / residual risk

- Two-real-account isolation test and Google sign-in end to end (needs real accounts and the Supabase redirect URLs set).
- Browser rendering on phones for the new pages (build and types only).
- Malware scanning of uploaded files (none).
- Vercel deployment protection settings; Supabase auth rate limits and MFA settings (dashboard).
- Historical backfill of old payments to student accounts: deliberately **not done**; only a future dry-run report is proposed.
- Admin MFA and finer roles (single admin allow-list today).
- Enforced CSP (still report-only).

## Launch decisions for the owner

1. Certificate print details per course (product, suffix, hours) in Admin > Training > Courses & Batches; confirm full payment required before certificate.
2. Supabase Site URL and redirect URLs; Google consent screen branding verification.
3. Privacy: retention, minors, export/deletion process.
4. Leaked-password protection toggle; Vercel protection setting.
