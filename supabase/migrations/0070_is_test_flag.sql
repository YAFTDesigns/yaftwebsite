-- Hide test/own entries from admin lists without deleting them.
-- Admin queries filter is_test = false. Reversible: set is_test back to false.
alter table public.leads add column if not exists is_test boolean not null default false;
alter table public.enquiries add column if not exists is_test boolean not null default false;

update public.enquiries set is_test = true where id in (
  '14580f53-76ea-4378-8ba3-908bd66cac3d','f26903c8-d308-45c9-9866-791563bdd762',
  '9a231d2d-792f-43fc-9dee-fbf94f4e83da','dcc15f84-7cf3-41a9-9952-412691ef2408',
  '51d96ef9-f5b4-46f0-a519-5d80aa354129','7d39a4fd-9fd1-48f7-9687-b961d9f3d46c',
  '35b73393-68ba-4091-b18c-c720865ca16f','0c50bb4f-e239-49cd-b920-5b05c6620485',
  '472bca98-da15-485c-9c1d-f58d24e6dc3f','a803ab0c-95bd-4769-8c97-1c5a7965fa79');
update public.leads set is_test = true where id in (
  '7d6338f7-2ea5-4b2c-bdab-d09cb82fcc73','8887bfe8-5eb2-4670-9cd8-3efbf8d96817',
  '968609d5-0a1b-4469-b5c1-559193531cd8','b324eb99-5932-4cdc-bb08-12be166f365f');
