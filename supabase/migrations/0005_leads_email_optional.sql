-- Syllabus gate now accepts email OR LinkedIn instead of requiring both,
-- so leads can no longer be guaranteed to have an email.
alter table leads alter column email drop not null;
alter table leads add constraint leads_linkedin_url_key unique (linkedin_url);
