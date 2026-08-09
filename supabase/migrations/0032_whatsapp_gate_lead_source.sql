-- WhatsApp button now gates behind an email capture, same pattern as
-- the syllabus gate. leads.source needs a third allowed value.
alter table leads drop constraint leads_source_check;
alter table leads add constraint leads_source_check check (source in ('syllabus_gate', 'contact_form', 'whatsapp_gate'));
