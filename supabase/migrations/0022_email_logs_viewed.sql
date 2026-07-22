-- The admin nav shows a red badge for failed emails (see
-- lib/admin/getNavCounts.ts), but it never cleared: it counted every
-- failed row ever, so once one send failed the badge stuck around
-- forever even after the admin had seen it. This adds a viewed_at
-- timestamp so the badge behaves like a normal notification: it
-- clears once the admin opens the Emails page, and only reappears
-- if a new send fails afterward.

alter table public.email_logs
  add column if not exists viewed_at timestamptz;
