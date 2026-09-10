-- Lets the testimonial-request reminder (below) dedupe per specific
-- completed job, not just per client email -- a repeat client
-- completing a new job should still get asked for a fresh
-- testimonial about that engagement, not be silently skipped because
-- they were asked once before for a different job.
alter table email_logs add column if not exists job_id uuid;
