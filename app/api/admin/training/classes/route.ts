import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { adminEmail } from '@/lib/admin/adminEmail';
import { sameOrigin } from '@/lib/student/csrf';
import { cleanText } from '@/lib/student/safe';
import { audit } from '@/lib/student/audit';
import { cleanMeetUrl, cleanHttps } from '@/lib/student/classes';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

/** Who is enrolled in each course: linked plans that are not cancelled and have a payment (or are legacy bills). */
async function rosterBySlug() {
  const a = getSupabaseAdmin();
  const { data: links } = await a.from('student_enrolments').select('student_id, plan_id, course_payment_plans(client_name, status, course_slugs, source)').limit(3000);
  const planIds = (links ?? []).map((l) => l.plan_id as string);
  const { data: pays } = planIds.length ? await a.from('course_payments').select('plan_id').in('plan_id', planIds).eq('status', 'paid') : { data: [] as { plan_id: string }[] };
  const paid = new Set((pays ?? []).map((p) => p.plan_id));
  const map: Record<string, { studentId: string; name: string }[]> = {};
  for (const l of links ?? []) {
    const f = l.course_payment_plans as unknown as { client_name: string; status: string; course_slugs: string[] | null; source: string | null } | { client_name: string; status: string; course_slugs: string[] | null; source: string | null }[] | null;
    const p = Array.isArray(f) ? f[0] : f;
    if (!p || p.status === 'cancelled' || !(paid.has(l.plan_id as string) || p.source === 'legacy')) continue;
    for (const slug of p.course_slugs ?? []) (map[slug] ??= []).push({ studentId: l.student_id as string, name: p.client_name });
  }
  return map;
}

export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const a = getSupabaseAdmin();
  const { data: sessions } = await a.from('class_sessions').select('id, course_slug, title, starts_at, ends_at, meet_url, recording_url, notes, cancelled_at').is('cancelled_at', null).order('starts_at', { ascending: false }).limit(200);
  const ids = (sessions ?? []).map((s) => s.id as string);
  const [{ data: att }, roster] = await Promise.all([
    ids.length ? a.from('class_attendance').select('session_id, student_id, first_joined_at, join_count').in('session_id', ids) : Promise.resolve({ data: [] as { session_id: string; student_id: string; first_joined_at: string; join_count: number }[] }),
    rosterBySlug(),
  ]);
  const out = (sessions ?? []).map((s) => {
    const enrolled = roster[s.course_slug] ?? [];
    const joined = (att ?? []).filter((x) => x.session_id === s.id);
    const joinedIds = new Set(joined.map((j) => j.student_id));
    return {
      ...s,
      enrolledCount: enrolled.length,
      joined: enrolled.filter((e) => joinedIds.has(e.studentId)).map((e) => ({ name: e.name, at: joined.find((j) => j.student_id === e.studentId)?.first_joined_at, times: joined.find((j) => j.student_id === e.studentId)?.join_count })),
      absent: enrolled.filter((e) => !joinedIds.has(e.studentId)).map((e) => e.name),
    };
  });
  return NextResponse.json({ sessions: out }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const who = (await adminEmail()) ?? 'admin';
  const b = await req.json().catch(() => ({}));
  const a = getSupabaseAdmin();

  if (b.action === 'create') {
    const slug = cleanText(b.course_slug, 80);
    const title = cleanText(b.title, 120);
    const meet = cleanMeetUrl(b.meet_url);
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(String(b.starts_at ?? ''));
    const dur = Math.round(Number(b.duration_min));
    if (!slug || !title || !m || !(dur >= 15 && dur <= 480)) return NextResponse.json({ error: 'Course, title, start time and a duration of 15 to 480 minutes are needed.' }, { status: 400 });
    if (!meet) return NextResponse.json({ error: 'Meeting link must be an https Google Meet, Zoom or Teams link.' }, { status: 400 });
    const { data: course } = await a.from('courses').select('slug').eq('slug', slug).maybeSingle();
    if (!course) return NextResponse.json({ error: 'Unknown course.' }, { status: 400 });
    const first = new Date(`${m[1]}T${m[2]}:00+05:30`).getTime(); // admin enters India time
    const count = Math.min(Math.max(Math.round(Number(b.repeat_count) || 1), 1), 40);
    const step = Math.min(Math.max(Math.round(Number(b.step_days) || 7), 1), 30);
    const rows = Array.from({ length: count }, (_, i) => {
      const start = first + i * step * 86_400_000;
      return { course_slug: slug, title: count > 1 ? `${title} ${i + 1}` : title, starts_at: new Date(start).toISOString(), ends_at: new Date(start + dur * 60_000).toISOString(), meet_url: meet, notes: cleanText(b.notes, 500) || null, created_by: who };
    });
    const { error } = await a.from('class_sessions').insert(rows);
    if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_sessions_created', subject: slug, detail: { count } });
    return NextResponse.json({ ok: true, count });
  }
  if (b.action === 'update') {
    if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (b.meet_url !== undefined) { const u = cleanMeetUrl(b.meet_url); if (!u) return NextResponse.json({ error: 'Meeting link must be an https Google Meet, Zoom or Teams link.' }, { status: 400 }); patch.meet_url = u; }
    if (b.recording_url !== undefined) patch.recording_url = cleanHttps(b.recording_url);
    if (b.notes !== undefined) patch.notes = cleanText(b.notes, 500) || null;
    const { error } = await a.from('class_sessions').update(patch).eq('id', b.id);
    if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_session_updated', subject: b.id, detail: {} });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'cancel') {
    if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    await a.from('class_sessions').update({ cancelled_at: new Date().toISOString() }).eq('id', b.id);
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_session_cancelled', subject: b.id, detail: {} });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
