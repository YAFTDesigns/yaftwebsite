-- Enables per-invoice dedup for the overdue-balance reminder cron
-- (below), same pattern as job_id for the testimonial-request
-- reminder: check whether THIS specific invoice was already reminded
-- about before sending again, rather than a coarser check that could
-- either spam daily or silently never fire for a genuinely new one.
alter table email_logs add column if not exists invoice_id uuid;
