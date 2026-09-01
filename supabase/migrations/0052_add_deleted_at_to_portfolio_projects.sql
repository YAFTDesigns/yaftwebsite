-- Delete on this table was a genuine hard DELETE with no recovery
-- path -- confirmed by auditing every admin section for a trash/
-- restore safety net, matching the pattern already fixed for Labs
-- and Team. Portfolio projects are real showcased work; a mistaken
-- delete here would mean losing case-study content, not just a
-- listing entry. From here, deleting a project sets deleted_at
-- instead of removing the row.
alter table portfolio_projects add column if not exists deleted_at timestamptz;
