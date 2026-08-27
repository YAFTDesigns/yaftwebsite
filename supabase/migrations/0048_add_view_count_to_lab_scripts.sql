-- Separate from download_count: view_count tracks how many times a
-- script's detail view was actually opened (clicking its sidebar
-- title or its grid thumbnail), not just how many times the file was
-- downloaded. A visitor might view a script several times before
-- deciding to download it, or never download at all -- this captures
-- that interest signal distinctly from the download action.
alter table lab_scripts add column if not exists view_count integer not null default 0;
