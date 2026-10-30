# Course payment plans + Financial Year Report integration

Status: preview branch `course-payment-plans`. Not deployed. Migration 0080 not applied. Synthetic data only.
This is a review against OWASP ASVS / API Security as a framework. It is not a certification.

## What was reused (no second ledger)
- `invoices` table is still the only accounting record. The Financial Year Report and Excel export still read it.
- Each Razorpay payment makes ONE normal bill in `invoices` (advance, balance or full), with its own number (YAFT-MMYYYY-NN), date, taxable amount and GST. It is linked by `course_plan_id` / `course_payment_id`.
- New tables only hold what `invoices` cannot: plans, payments (gateway ids, fees, sync status), refund/credit-note adjustments, audit events.

## Accounting rules
- A bill counts once, in the FY of its own date. Payments are never a second revenue line.
- Advance and balance are separate bills. The balance bill is issued only when the balance is paid (not at enrolment).
- Cross-year: advance in March and balance in April land in FY 25-26 and FY 26-27 respectively. Tested.
- Razorpay fee/tax is stored on the payment row only. Never netted into a bill or the report. Bank settlements are NOT imported (see gaps).
- Refunds arrive from Razorpay as "needs review". They change no total until an admin issues a credit note, which reduces the FY it is issued in. Issued credit notes are final (no edit path).
- Issued bills from plans cannot be edited or trashed in Invoices (409). Correct with a credit note.
- Draft/proforma and test bills never count (report and export now exclude `test` as well as `proforma`).

## Findings
| # | Sev | Finding | Status |
|---|-----|---------|--------|
| 1 | Medium | FY report and export excluded proformas but not `test` bills, so test payments could inflate revenue | Fixed |
| 2 | Medium | Existing Invoices edit / trash actions could rewrite issued bills (audit-logged but unguarded) | Fixed for plan-linked bills |
| 3 | Medium | Pay link token appeared in analytics URLs and Referer | Fixed: no-referrer, noindex, excluded from GA and AnalyticsTracker; token is 192-bit random |
| 4 | Low | Webhook ignored refunds and disputes | Fixed: refunds recorded for review, disputes flagged, nothing auto-changed |
| 5 | Info | "Authorised admin roles": site has one flat admin list (ADMIN_EMAILS), no roles | Not changed. Every admin can see reports and run these actions. Recommend a role split if more admins are added |
| 6 | Info | Admin MFA | Not verified (Supabase Auth setting) |

## Controls tested (unit level, synthetic data, in-memory DB with the real unique-index rules)
Advance + balance, full payment, duplicate webhook, two simultaneous webhooks, second payment for a paid instalment (overpayment flagged), wrong amount (nothing issued, flagged), failed bill step then Retry (no duplicate), failed email then Retry (one email), partial refund recorded once and ignored for non-course payments, FY split across years, reconciliation catches: missing bill, duplicate bill, amount difference, failed sync, unreviewed refund, oversize refund/credit note.

## NOT verified (needs the live project)
- RLS: new tables use `enable row level security` + `revoke all` from anon/authenticated. After applying 0080, check with the anon key that all five tables return nothing.
- A real Razorpay test-mode payment end to end, including the webhook delivering `payment.captured`, `refund.processed`, `payment.dispute.*`. **The webhook in Razorpay must have refund.processed and the dispute events ticked, or refunds will not appear.**
- Razorpay returns `fee`/`tax` on the captured payment in your account (stored when present, blank otherwise).
- Backups / restore, MFA, preview vs production env separation.

## Gaps and decisions for your CA
- GST timing: this issues a tax invoice at each payment (advance and balance). A CA should confirm whether an advance needs a receipt voucher instead, and the treatment of the balance.
- Credit note: recorded and counted, but there is no credit-note PDF/email yet, and no GSTR filing format.
- Bank settlements are not reconciled (fee vs payout). Needs the Razorpay settlements API; not built.
- No historical backfill is needed: no course plans exist, existing manual invoices are untouched.
- Admin who issued a credit note / created a plan is recorded in `course_payment_events`.

## Launch checklist
1. CA confirms GST/invoice timing. 2. Apply migration 0080 (new tables only). 3. Tick refund and dispute events on the Razorpay webhook. 4. Test-mode run: plan -> advance -> balance -> partial refund -> credit note, check FY report. 5. Anon-key RLS check. 6. Then live.
