-- Remembers which Google Calendar event holds a class's Meet link, so reschedule/cancel can keep the calendar in step.
alter table public.class_sessions add column if not exists calendar_event_id text;
