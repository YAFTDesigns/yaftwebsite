-- Delete on this page was a genuine hard DELETE with no recovery path
-- -- confirmed by auditing every admin section for a trash/restore
-- safety net, matching the pattern Clients/Invoices/Jobs already have.
-- Labs is actively growing right now, so this is the most urgent one
-- to fix. From here, deleting a script sets deleted_at instead of
-- removing the row; the public page and the default admin list both
-- filter it out, but it stays recoverable via a Trash view.
alter table lab_scripts add column if not exists deleted_at timestamptz;
