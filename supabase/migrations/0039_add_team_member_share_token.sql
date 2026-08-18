-- Lets a team member (design team, etc.) be given a shareable link
-- that always shows a live, no-login "job sheet" -- every active job
-- across all clients, job details only, no pricing/rate/GST/total
-- columns. Same "anyone with the link" model already used for the
-- per-client job share links (clients.share_token).
alter table team_members add column if not exists share_token text unique;
