-- Security advisor finding: pin the search_path of the revision guard trigger function.
alter function public.project_revision_guard() set search_path = public, pg_temp;
