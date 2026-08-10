-- Replace billing-oriented status (Pending/Invoiced/Paid) with a work-progress
-- workflow, since jobs.status was tracking payment state but what's actually
-- needed is submission/review/completion tracking with dated history.
alter table jobs drop constraint jobs_status_check;
alter table jobs add constraint jobs_status_check check (status in ('Pending', 'Submitted', 'In Review', 'Completed'));

-- Every status change gets a dated row here rather than jobs.status just
-- being overwritten, since a job can go Submitted -> In Review -> Submitted
-- -> In Review -> Completed (multiple revision cycles), and each date
-- needs to stay visible, not just the most recent one.
create table if not exists job_status_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  status text not null check (status in ('Pending', 'Submitted', 'In Review', 'Completed')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists job_status_events_job_id_idx on job_status_events(job_id);

alter table job_status_events enable row level security;
-- Admin-only, same as jobs/clients: no public policies, server routes use
-- the service-role client exclusively.

-- Backfill: give each existing job a single history row matching its
-- current status, dated at job creation, so the timeline isn't empty
-- for jobs logged before this feature existed.
insert into job_status_events (job_id, status, created_at)
select id, status, created_at from jobs
where not exists (select 1 from job_status_events where job_status_events.job_id = jobs.id);
