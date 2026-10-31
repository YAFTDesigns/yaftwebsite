-- "About you" on the student profile: professional (designation + company) or student (college + field). All optional, additive.
alter table public.students
  add column if not exists occupation text check (occupation in ('professional','student')),
  add column if not exists designation text check (char_length(designation) <= 100),
  add column if not exists organisation text check (char_length(organisation) <= 120),
  add column if not exists college text check (char_length(college) <= 150),
  add column if not exists study_field text check (char_length(study_field) <= 120);
