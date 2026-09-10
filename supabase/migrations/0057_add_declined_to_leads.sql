-- The lead follow-up reminder (below) needs a way to know "don't
-- contact this person again" -- the system has no way to read
-- Yokes' inbox and detect a reply saying "not interested", so this
-- is a manual flag he sets himself from the admin Leads page when he
-- sees a rejection. Defaults to false; the reminder cron excludes
-- anyone marked true.
alter table leads add column if not exists declined boolean not null default false;
