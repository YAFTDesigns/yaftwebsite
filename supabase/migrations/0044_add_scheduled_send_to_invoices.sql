-- Scheduled sending for invoices (any type -- training, consultancy,
-- proforma, test): the invoice row + PDF-worthy data is created
-- immediately as usual, but the email can be held until a future
-- date instead of going out right away, with a way to cancel before
-- that happens.
--
-- scheduled_send_at: null means "send immediately" (existing
-- behavior, unchanged). Set to a future timestamp means "hold until
-- then" -- picked up by a new cron job.
-- email_sent_at: when the email actually went out, whether that was
-- immediate or via the scheduled-send cron. Backfilled from
-- created_at for every existing invoice, since they were all sent
-- immediately at creation time before this feature existed.
-- send_cancelled: set true to cancel a still-pending scheduled send.
-- The cron checks this before sending, so a cancelled invoice's email
-- never goes out even if its scheduled time has already passed.
alter table invoices add column if not exists scheduled_send_at timestamptz;
alter table invoices add column if not exists email_sent_at timestamptz;
alter table invoices add column if not exists send_cancelled boolean not null default false;
