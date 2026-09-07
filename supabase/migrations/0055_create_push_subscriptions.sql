-- Real browser push notifications for new enquiries, replacing the
-- email-alert idea Yokes specifically declined (email quota already
-- shared with customer-facing sends). Single-admin tool, so no per-
-- user linkage -- just the raw subscription details the Web Push
-- protocol needs to reach a specific browser/device. RLS enabled with
-- no anon policies, same pattern as every other table: only ever
-- touched via the service-role key from admin-authenticated routes.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
