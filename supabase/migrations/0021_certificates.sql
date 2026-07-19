-- Student certificate verification system. A pre-existing empty
-- 'certificates' table from earlier scaffolding (columns:
-- certificate_code, course_slug, pdf_storage_path, status, issued_by)
-- was dropped and replaced -- it had no data and no code depended on
-- it, and its schema didn't fit (notably pdf_storage_path, which
-- contradicts the explicit decision to generate PDFs on demand from
-- metadata rather than store them).
--
-- No PDF is ever stored here. lib/certificatePdf.ts regenerates the
-- certificate from these fields against the fixed template image
-- every time someone downloads it, the same pattern already used for
-- invoices.

create table if not exists public.certificates (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  certificate_id   text not null unique,   -- e.g. "YAFT202607-05", printed on the PDF
  student_name     text not null,
  student_email    text,
  course_key       text not null,          -- matches COURSE_ACCENTS keys in lib/certificatePdf.ts
  course_suffix    text not null,          -- e.g. "FOR ARCHITECTURE"
  duration_hours   text not null,          -- e.g. "30"
  issue_date       date not null default current_date,
  revoked          boolean not null default false,
  notes            text
);

alter table public.certificates enable row level security;
create index if not exists certificates_certificate_id_idx on public.certificates (certificate_id);

-- Public verification only ever looks up by exact certificate_id (no
-- listing/browsing endpoint is built on top of this), so a blanket
-- read policy on non-revoked rows is safe -- there's no way to
-- enumerate students without already knowing their code.
create policy "public read certificates by exact id"
  on public.certificates for select
  using (revoked = false);
