import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const cleanQ = (v: string | null) => (v ?? '').trim().replace(/[^a-zA-Z0-9@.+\-\s]/g, '').slice(0, 80);

type Result = { kind: string; title: string; subtitle: string; href: string };

export async function GET(req: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  const q = cleanQ(req.nextUrl.searchParams.get('q'));
  if (q.length < 2) return NextResponse.json({ results: [] }, { headers: NO_STORE });

  const a = getSupabaseAdmin();
  const like = `%${q}%`;
  const [students, leads, invoices, certificates] = await Promise.all([
    a.from('students').select('id, display_name, certificate_name').or(`display_name.ilike.${like},certificate_name.ilike.${like}`).is('deleted_at', null).limit(6),
    a.from('leads').select('id, name, email, organisation, status').or(`name.ilike.${like},email.ilike.${like},organisation.ilike.${like}`).eq('is_test', false).limit(6),
    a.from('invoices').select('id, invoice_no, client_name, balance').or(`invoice_no.ilike.${like},client_name.ilike.${like}`).is('deleted_at', null).limit(6),
    a.from('certificates').select('id, certificate_id, student_name, course_suffix, revoked').or(`certificate_id.ilike.${like},student_name.ilike.${like}`).limit(6),
  ]);

  const results: Result[] = [
    ...(students.data ?? []).map((x) => ({ kind: 'Student', title: x.display_name ?? x.certificate_name ?? 'Student', subtitle: x.certificate_name ? `Certificate: ${x.certificate_name}` : 'Student portal profile', href: `/admin/training/student/${x.id}` })),
    ...(leads.data ?? []).map((x) => ({ kind: 'Lead', title: x.name ?? x.email, subtitle: [x.organisation, x.status].filter(Boolean).join(' · ') || x.email, href: `/admin/leads/${x.id}` })),
    ...(invoices.data ?? []).map((x) => ({ kind: 'Invoice', title: x.invoice_no, subtitle: `${x.client_name} · ${Number(x.balance) > 0 ? `₹${Number(x.balance).toLocaleString('en-IN')} due` : 'Paid'}`, href: '/admin/invoices' })),
    ...(certificates.data ?? []).map((x) => ({ kind: 'Certificate', title: x.certificate_id, subtitle: `${x.student_name} · ${x.course_suffix ?? ''}${x.revoked ? ' · Revoked' : ''}`, href: '/admin/certificates' })),
  ].slice(0, 16);

  return NextResponse.json({ results }, { headers: NO_STORE });
}
