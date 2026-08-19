-- Which team member (design team) is assigned to a job. Nullable and
-- FK to team_members with ON DELETE SET NULL -- if a team member is
-- ever hard-deleted, jobs assigned to them shouldn't be orphaned or
-- block the delete, just fall back to unassigned.
alter table jobs add column if not exists designer_id uuid references team_members(id) on delete set null;

-- Denormalized copy of the designer's name, same convention already
-- used for client_id/client_name -- avoids a join just to display who
-- a job is assigned to, and keeps working even if designer_id later
-- gets set to null by the FK's ON DELETE SET NULL.
alter table jobs add column if not exists designer_name text;
