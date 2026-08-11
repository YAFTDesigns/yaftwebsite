-- Internal team/contacts directory -- accountant, designers, anyone
-- Yokes needs a saved name/role/email/phone for (e.g. picking who to
-- email the monthly invoice export to). salary is nullable and unused
-- for now, included so this table can double as a basic payroll record
-- later without a second migration.
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  role text,
  email text,
  phone text,
  salary numeric,
  notes text,
  active boolean not null default true,
  deleted_at timestamptz
);

alter table team_members enable row level security;
-- Admin-only, same as jobs/clients: no public policies, server routes
-- use the service-role client exclusively. Extra important here since
-- this table can hold salary figures.
