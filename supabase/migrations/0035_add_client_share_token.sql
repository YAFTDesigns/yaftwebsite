-- Lets a client be given a shareable link (/api/share/jobs/[token]) that
-- always renders their current jobs as a fresh .xlsx -- no login, the
-- unguessable token itself is the credential, same "anyone with the
-- link" model as Google Docs sharing. Generated lazily per client from
-- the admin UI, not backfilled for existing rows.
alter table clients add column if not exists share_token text unique;
