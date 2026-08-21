-- Free-text training schedule (days, hours per session, cadence) that
-- gets included in the proforma invoice email under a SCHEDULE
-- heading when present. Nullable and unused for regular invoices --
-- only meaningful for training proforma quotes where the schedule is
-- part of what's being confirmed alongside the 50% advance.
alter table invoices add column if not exists schedule_note text;
