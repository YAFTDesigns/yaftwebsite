-- Tortoise (Rhino plugin) licence keys. Read and written only by the server
-- (service role), so RLS is on with NO policies: anon/authenticated get nothing.
create table if not exists public.tortoise_licenses (
  key text primary key,                        -- TORT-XXXX-XXXX-XXXX
  email text not null,
  note text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,                      -- null = perpetual
  max_machines int not null default 2 check (max_machines between 1 and 50),
  created_at timestamptz not null default now()
);

create table if not exists public.tortoise_activations (
  key text not null references public.tortoise_licenses(key) on delete cascade,
  machine text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (key, machine)
);

alter table public.tortoise_licenses enable row level security;
alter table public.tortoise_activations enable row level security;
