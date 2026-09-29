-- Real lead workflow, collapsed from the spec's 6 stages to 5:
-- "Follow-up" already has a better home (the follow-up reminder
-- cron), and "Lost" overlaps with the existing declined flag for
-- anyone excluded from automation. status tracks active pipeline
-- position only; declined stays the separate "stop contacting" flag.
alter table leads add column if not exists status text not null default 'new'
  check (status in ('new','contacted','interested','confirmed','lost'));
alter table leads add column if not exists notes text;
alter table leads add column if not exists follow_up_date date;
