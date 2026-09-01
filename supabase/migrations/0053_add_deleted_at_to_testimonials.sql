-- Delete on this table was a genuine hard DELETE with no recovery
-- path -- third of four from the admin-wide safety-net audit.
-- Testimonials require a real uploaded photo to submit (a genuine,
-- deliberate act by the submitter), so a mistaken delete here means
-- losing something a real person took the time to write and upload,
-- not just a database row. From here, deleting a testimonial sets
-- deleted_at instead of removing the row.
alter table testimonials add column if not exists deleted_at timestamptz;
