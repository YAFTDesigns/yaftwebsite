-- Business-development leads (institutions/companies to approach) --
-- deliberately a separate table from the existing `leads` table,
-- which tracks inbound website visitors (syllabus gate, WhatsApp
-- clicks). Different concept entirely: this is outbound targets
-- Yokes researches and pursues, not people who found the site.
create table if not exists bd_leads (
  id uuid primary key default gen_random_uuid(),
  organization text not null,
  segment text,
  country text,
  city text,
  website text,
  department text,
  contact_name text,
  contact_role text,
  contact_channel text,
  opportunity text,
  relevant_service text,
  evidence text,
  personalization_angle text,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  status text not null default 'researched' check (status in (
    'researched','qualified','contact_identified','outreach_ready',
    'contacted','replied','discussion','proposal','negotiation','won','lost'
  )),
  last_contact_date date,
  next_action text,
  follow_up_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table bd_leads enable row level security;
-- Case-insensitive uniqueness on organization -- update the existing
-- row instead of creating a duplicate, per the spec's explicit rule.
create unique index if not exists bd_leads_org_unique on bd_leads (lower(organization));
