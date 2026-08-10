-- Job order number, e.g. GY0001. Free-text like invoice_no (no unique
-- constraint at the DB level -- invoice_no doesn't have one either),
-- auto-suggested client-side as the next sequential number but editable,
-- same convention as invoice numbering.
alter table jobs add column if not exists job_no text;
