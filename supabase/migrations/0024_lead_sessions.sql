-- Links an anonymous analytics session_id to a named lead once they
-- identify themselves (syllabus unlock or contact form). Lets us
-- compute "time on site" for a lead from their page_view events,
-- and auto-tags future events from that session as theirs too.
create table if not exists public.lead_sessions (
  session_id text primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  linked_at timestamptz not null default now()
);

create index if not exists lead_sessions_lead_id_idx on public.lead_sessions(lead_id);

alter table public.lead_sessions enable row level security;

-- Server (service role) only, same as leads/analytics_events -- no
-- public policies, admin API routes use the service-role client.
