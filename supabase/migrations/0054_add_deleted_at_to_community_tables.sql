-- Delete on all three community tables was a genuine hard DELETE with
-- no recovery path -- last of four from the admin-wide safety-net
-- audit. student_work and publications are real submissions from
-- students/community members (someone's actual work, deliberately
-- shared); partners are the businesses/institutions shown site-wide.
-- A mistaken delete on any of these means losing real content or
-- silently dropping a partner logo from the site, not just a row.
alter table student_work add column if not exists deleted_at timestamptz;
alter table publications add column if not exists deleted_at timestamptz;
alter table partners add column if not exists deleted_at timestamptz;
