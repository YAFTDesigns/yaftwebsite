-- Soft delete for invoices: instead of permanently removing rows
-- (which was also silently failing due to no RLS delete policy),
-- mark them as deleted with a timestamp. Deleted invoices are excluded
-- from all normal views and analytics by default, but remain
-- recoverable from a Trash view and can be permanently purged later
-- if genuinely needed.

alter table public.invoices
  add column if not exists deleted_at timestamptz default null;

-- Index to make "exclude deleted" queries fast as the table grows
create index if not exists invoices_deleted_at_idx
  on public.invoices (deleted_at);
