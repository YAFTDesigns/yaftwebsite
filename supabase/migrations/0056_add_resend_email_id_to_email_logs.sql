-- Enables precise bounce-webhook matching (rather than guessing by
-- to_email + nearest timestamp, which breaks down for repeated sends
-- to the same address). sendEmail() now returns Resend's own email
-- id, and every email_logs insert site stores it alongside status.
alter table email_logs add column if not exists resend_email_id text;
create index if not exists idx_email_logs_resend_email_id on email_logs(resend_email_id);
