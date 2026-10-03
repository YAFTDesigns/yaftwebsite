-- Holds rotating third-party tokens (currently the Instagram long-lived token) so a
-- scheduled job can refresh them without anyone editing Vercel env vars.
-- Service role only: RLS on, no policies, no grants.
create table if not exists public.integration_tokens (
  name text primary key,
  token text not null,
  expires_at timestamptz,
  refreshed_at timestamptz not null default now()
);
alter table public.integration_tokens enable row level security;
revoke all on public.integration_tokens from anon, authenticated;
