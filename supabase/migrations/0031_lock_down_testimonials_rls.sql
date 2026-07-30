-- service_role_all_testimonials was named as if scoped to service_role
-- but had no role restriction and no auth.role() check at all --
-- USING(true) applied to PUBLIC for ALL commands (select/insert/
-- update/delete). Anyone with the public anon key could have read
-- pending/unapproved testimonials, inserted fake approved ones
-- bypassing the moderation workflow, or deleted any testimonial
-- outright.
--
-- Every real touch of this table already goes through server-side
-- routes using the service-role client (confirmed: app/api/testimonials
-- and app/api/admin/testimonials both use getSupabaseAdmin, never the
-- anon client), which bypasses RLS regardless of policy. This policy
-- had zero legitimate purpose.
--
-- public_insert_testimonials (insert requires status='pending') and
-- public_read_approved (select requires status='approved') stay --
-- they're correctly scoped and match the same pattern already used
-- safely for student_work/publications.

drop policy if exists "service_role_all_testimonials" on public.testimonials;
