-- Lead capture by audience + daily-control fields.
--  * enquiries: who they are (audience), which funnel page, what they need,
--    organisation, and the page the form was on. All nullable: old rows stay
--    "not recorded" rather than guessed.
--  * leads: latest audience/funnel/need/organisation/service interest copied
--    from the newest enquiry so the admin can filter without joins, plus
--    proposal and payment status (set by hand in the admin).
--  * lead_notes: append-only history (notes, status changes, system events).
-- Service role only: RLS on, no policies, no grants for anon/authenticated.

alter table public.enquiries
  add column if not exists audience text check (audience in ('student','professional','college','company')),
  add column if not exists funnel text check (funnel in ('individual','college','corporate','consulting')),
  add column if not exists need text check (char_length(need) <= 120),
  add column if not exists organisation text check (char_length(organisation) <= 120),
  add column if not exists source_page text check (char_length(source_page) <= 120);

alter table public.leads
  add column if not exists audience text check (audience in ('student','professional','college','company')),
  add column if not exists funnel text check (funnel in ('individual','college','corporate','consulting')),
  add column if not exists need text check (char_length(need) <= 120),
  add column if not exists organisation text check (char_length(organisation) <= 120),
  add column if not exists service_interest text check (char_length(service_interest) <= 120),
  add column if not exists proposal_status text not null default 'none'
    check (proposal_status in ('none','drafted','sent','accepted','declined')),
  add column if not exists proposal_updated_at timestamptz,
  add column if not exists payment_status text not null default 'none'
    check (payment_status in ('none','advance_due','advance_paid','balance_due','paid')),
  add column if not exists payment_updated_at timestamptz;

create index if not exists idx_leads_follow_up on public.leads(follow_up_date) where follow_up_date is not null;
create index if not exists idx_leads_funnel on public.leads(funnel);
create index if not exists idx_enquiries_funnel on public.enquiries(funnel);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note','status','follow_up','proposal','payment','system')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_notes_lead on public.lead_notes(lead_id, created_at desc);

alter table public.lead_notes enable row level security;
revoke all on public.lead_notes from anon, authenticated;
