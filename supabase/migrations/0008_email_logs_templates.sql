-- Email logs — track every email sent
create table if not exists public.email_logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  to_email     text not null,
  to_name      text not null,
  subject      text not null,
  template     text not null default 'enquiry_confirmation',
  status       text not null default 'sent',  -- 'sent' | 'failed'
  error        text,
  enquiry_id   uuid references public.enquiries(id) on delete set null
);

alter table public.email_logs enable row level security;

-- Email templates — editable from admin
create table if not exists public.email_templates (
  id           uuid primary key default gen_random_uuid(),
  updated_at   timestamptz default now(),
  key          text unique not null,
  subject      text not null,
  body_html    text not null
);

alter table public.email_templates enable row level security;

-- Seed default enquiry confirmation template
insert into public.email_templates (key, subject, body_html) values (
  'enquiry_confirmation',
  'Re: Your enquiry{{interest}} — YAFT Designs',
  '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <h2 style="margin-bottom:4px;">Thanks, {{name}}.</h2>
  <p style="color:#555;font-size:14px;line-height:1.7;margin-bottom:16px;">
    We''ve received your enquiry{{interest_line}} and will get back to you within 1–2 working days.
  </p>
  <p style="color:#555;font-size:14px;line-height:1.7;margin-bottom:20px;">
    Feel free to reply to this email directly — it comes straight to us.
  </p>
  <div style="background:#f8f8f8;border-left:3px solid #E63946;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:24px;">
    <p style="margin:0;font-size:12px;color:#888;">Your message</p>
    <p style="margin:8px 0 0;font-size:14px;color:#111;">{{message}}</p>
  </div>
  <p style="color:#888;font-size:12px;">
    YAFT Designs · Authorized Rhino Training Center · Coimbatore, India<br>
    <a href="https://yaftdesigns.com" style="color:#E63946;">yaftdesigns.com</a>
  </p>
</div>'
) on conflict (key) do nothing;
