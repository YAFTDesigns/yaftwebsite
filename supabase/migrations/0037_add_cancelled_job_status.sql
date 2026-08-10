-- Add a real Cancelled status (previously only Pending/Submitted/In
-- Review/Completed existed) so cancelled jobs get their own dated
-- history entry and a distinct color in exports, rather than being
-- awkwardly left at whatever status they were in when work stopped.
alter table jobs drop constraint jobs_status_check;
alter table jobs add constraint jobs_status_check check (status in ('Pending', 'Submitted', 'In Review', 'Completed', 'Cancelled'));

alter table job_status_events drop constraint job_status_events_status_check;
alter table job_status_events add constraint job_status_events_status_check check (status in ('Pending', 'Submitted', 'In Review', 'Completed', 'Cancelled'));
