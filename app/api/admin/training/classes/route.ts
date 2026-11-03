import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { adminEmail } from '@/lib/admin/adminEmail';
import { sameOrigin } from '@/lib/student/csrf';
import { cleanText } from '@/lib/student/safe';
import { audit } from '@/lib/student/audit';
import { cleanMeetUrl, cleanHttps } from '@/lib/student/classes';
import { sendEmail, isEmailConfigured, escapeHtml } from '@/lib/email';
import { brandedEmail } from '@/lib/emailLayout';
import { meetConfigured, createMeetEvent, moveMeetEvent, deleteMeetEvent } from '@/lib/googleMeet';

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


/** Emails the given students (by student id). Never throws; returns how many were sent. */
async function emailStudents(studentIds: string[], subject: string, heading: string, bodyHtml: string): Promise<number> {
  if (!isEmailConfigured() || !studentIds.length) return 0;
  const a = getSupabaseAdmin();
  const { data: sts } = await a.from('students').select('id, user_id, display_name').in('id', studentIds.slice(0, 100));
  let sent = 0;
  for (const st of sts ?? []) {
    try {
      const { data: u } = await a.auth.admin.getUserById(st.user_id as string);
      const to = u?.user?.email;
      if (!to) continue;
      await sendEmail({ to, subject, html: brandedEmail({ heading, bodyHtml: `<p>Hi ${escapeHtml((st.display_name as string) || 'there')},</p>${bodyHtml}`, cta: { label: 'Open student portal', href: 'https://www.yaftdesigns.com/student' } }) });
      sent += 1;
    } catch (e) { console.error('[classes] student email failed:', e); }
  }
  return sent;
}

export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const a = getSupabaseAdmin();
  const { data: sessions } = await a.from('class_sessions').select('id, course_slug, title, starts_at, ends_at, meet_url, recording_url, notes, cancelled_at, student_ids, series_id').is('cancelled_at', null).order('starts_at', { ascending: false }).limit(200);
  const ids = (sessions ?? []).map((s) => s.id as string);
  const [{ data: att }, roster] = await Promise.all([
    ids.length ? a.from('class_attendance').select('session_id, student_id, first_joined_at, join_count, source').in('session_id', ids) : Promise.resolve({ data: [] as { session_id: string; student_id: string; first_joined_at: string; join_count: number; source: string }[] }),
    rosterBySlug(),
  ]);
  const out = (sessions ?? []).map((s) => {
    const all = roster[s.course_slug] ?? [];
    const only = s.student_ids as string[] | null;
    const enrolled = only ? all.filter((e) => only.includes(e.studentId)) : all;
    const joined = (att ?? []).filter((x) => x.session_id === s.id);
    const joinedIds = new Set(joined.map((j) => j.student_id));
    return {
      ...s,
      enrolledCount: enrolled.length,
      forName: only ? (enrolled.map((e) => e.name).join(', ') || 'Selected students') : null,
      people: enrolled.map((e) => { const j = joined.find((x) => x.student_id === e.studentId); return { studentId: e.studentId, name: e.name, present: !!j, manual: j?.source === 'manual', times: j?.join_count ?? 0 }; }),
      joined: enrolled.filter((e) => joinedIds.has(e.studentId)).map((e) => ({ name: e.name, at: joined.find((j) => j.student_id === e.studentId)?.first_joined_at, times: joined.find((j) => j.student_id === e.studentId)?.join_count })),
      absent: enrolled.filter((e) => !joinedIds.has(e.studentId)).map((e) => e.name),
    };
  });
  return NextResponse.json({ sessions: out, roster, meetAuto: meetConfigured() }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const who = (await adminEmail()) ?? 'admin';
  const b = await req.json().catch(() => ({}));
  const a = getSupabaseAdmin();

  if (b.action === 'create') {
    const slug = cleanText(b.course_slug, 80);
    let title = cleanText(b.title, 120);
    const typedMeet = String(b.meet_url ?? '').trim();
    const meet = typedMeet ? cleanMeetUrl(typedMeet) : null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/.exec(String(b.starts_at ?? ''));
    const dur = Math.round(Number(b.duration_min));
    if (!slug || !m || !(dur >= 15 && dur <= 480)) return NextResponse.json({ error: 'Course, start time and a duration of 15 to 480 minutes are needed.' }, { status: 400 });
    if (typedMeet && !meet) return NextResponse.json({ error: 'Meeting link must be an https Google Meet, Zoom or Teams link.' }, { status: 400 });
    if (!typedMeet && !meetConfigured()) return NextResponse.json({ error: 'Paste a meeting link, or connect Google so the site can create one for you.' }, { status: 400 });
    const { data: course } = await a.from('courses').select('slug, title').eq('slug', slug).maybeSingle();
    if (!course) return NextResponse.json({ error: 'Unknown course.' }, { status: 400 });
    if (!title) title = cleanText(course.title, 100) || 'Class';
    let studentIds: string[] | null = null;
    const wanted: unknown[] = Array.isArray(b.student_ids) ? b.student_ids : b.student_id ? [b.student_id] : [];
    if (wanted.length) {
      if (wanted.length > 3 || !wanted.every(uuid)) return NextResponse.json({ error: 'Choose 1 to 3 students for a private session.' }, { status: 400 });
      const roster = await rosterBySlug();
      const okIds = new Set((roster[slug] ?? []).map((e) => e.studentId));
      if (!(wanted as string[]).every((id) => okIds.has(id))) return NextResponse.json({ error: 'Every student must be enrolled (paid) in this course.' }, { status: 400 });
      studentIds = [...new Set(wanted as string[])];
    }
    const count = Math.min(Math.max(Math.round(Number(b.repeat_count) || 1), 1), 60);
    const days: number[] = Array.isArray(b.weekdays) ? b.weekdays.map(Number).filter((n: number) => n >= 0 && n <= 6) : [];
    const step = Math.min(Math.max(Math.round(Number(b.step_days) || 7), 1), 30);
    // India has no daylight saving, so a fixed +05:30 offset is exact. Dates are walked as plain calendar days.
    const y = +m[1], mo = +m[2], d0 = +m[3];
    const starts: number[] = [];
    for (let i = 0; i < 800 && starts.length < count; i++) {
      const day = new Date(Date.UTC(y, mo - 1, d0 + i));
      if (days.length ? !days.includes(day.getUTCDay()) : (count > 1 && i % step !== 0)) continue;
      const ymd = day.toISOString().slice(0, 10);
      starts.push(new Date(`${ymd}T${m[4]}:00+05:30`).getTime());
    }
    if (!starts.length) return NextResponse.json({ error: 'No dates came out of that pattern.' }, { status: 400 });
    const seriesId = crypto.randomUUID();
    const notes = cleanText(b.notes, 500) || null;
    const base = starts.map((st, i) => ({ title: starts.length > 1 ? `${title} ${i + 1}` : title, startIso: new Date(st).toISOString(), endIso: new Date(st + dur * 60_000).toISOString() }));
    // A pasted link is shared by every class. With no link, each class gets its own Google Meet.
    const made: { eventId: string; meetUrl: string }[] = [];
    if (!meet) {
      try {
        for (let i = 0; i < base.length; i += 5) made.push(...await Promise.all(base.slice(i, i + 5).map((r) => createMeetEvent({ title: r.title, startIso: r.startIso, endIso: r.endIso, description: notes }))));
      } catch (e) {
        await Promise.all(made.map((m2) => deleteMeetEvent(m2.eventId)));
        return NextResponse.json({ error: `Could not create the Meet links, nothing was added. ${e instanceof Error ? e.message : ''}`.trim() }, { status: 502 });
      }
    }
    const rows = base.map((r, i) => ({ course_slug: slug, title: r.title, starts_at: r.startIso, ends_at: r.endIso, meet_url: meet ?? made[i].meetUrl, calendar_event_id: meet ? null : made[i].eventId, notes, created_by: who, student_ids: studentIds, series_id: seriesId }));
    const { error } = await a.from('class_sessions').insert(rows);
    if (error) { await Promise.all(made.map((m2) => deleteMeetEvent(m2.eventId))); return NextResponse.json({ error: 'Could not save' }, { status: 500 }); }
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_sessions_created', subject: slug, detail: { count: rows.length, private: !!studentIds } });
    let emailed = 0;
    if (b.notify !== false) {
      const roster = await rosterBySlug();
      const ids = studentIds ?? (roster[slug] ?? []).map((e) => e.studentId);
      const first = new Date(starts[0]).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
      emailed = await emailStudents([...new Set(ids)], 'Your YAFT classes are scheduled',
        studentIds ? 'Your private classes are scheduled' : 'Your classes are scheduled',
        `<p><strong>${escapeHtml(title)}</strong>: ${rows.length} class${rows.length > 1 ? 'es' : ''}, first on <strong>${escapeHtml(first)} IST</strong>.</p><p>Open your student portal and go to <strong>Classes</strong>. The Join button opens 15 minutes before each class, and your attendance is recorded when you join.</p>`);
    }
    return NextResponse.json({ ok: true, count: rows.length, emailed });
  }
  if (b.action === 'reschedule') {
    if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(String(b.starts_at ?? ''));
    const dur = Math.round(Number(b.duration_min));
    if (!m || !(dur >= 15 && dur <= 480)) return NextResponse.json({ error: 'A new start time and a duration of 15 to 480 minutes are needed.' }, { status: 400 });
    const { data: cur } = await a.from('class_sessions').select('id, title, starts_at, series_id, student_ids, course_slug, calendar_event_id').eq('id', b.id).is('cancelled_at', null).maybeSingle();
    if (!cur) return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    const newStart = new Date(`${m[1]}T${m[2]}:00+05:30`).getTime();
    const delta = newStart - new Date(cur.starts_at).getTime();
    let targets = [{ id: cur.id as string, starts_at: cur.starts_at as string, ev: (cur.calendar_event_id as string | null) ?? null }];
    if (b.scope === 'following' && cur.series_id) {
      const { data: later } = await a.from('class_sessions').select('id, starts_at, calendar_event_id').eq('series_id', cur.series_id).is('cancelled_at', null).gt('starts_at', cur.starts_at).order('starts_at');
      targets = [...targets, ...(later ?? []).map((l) => ({ id: l.id as string, starts_at: l.starts_at as string, ev: (l.calendar_event_id as string | null) ?? null }))];
    }
    for (const t of targets) {
      const st = new Date(t.starts_at).getTime() + delta;
      const { error } = await a.from('class_sessions').update({ starts_at: new Date(st).toISOString(), ends_at: new Date(st + dur * 60_000).toISOString() }).eq('id', t.id);
      if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
      if (t.ev && meetConfigured()) await moveMeetEvent(t.ev, new Date(st).toISOString(), new Date(st + dur * 60_000).toISOString());
    }
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_session_rescheduled', subject: cur.id, detail: { moved: targets.length } });
    let emailed = false;
    const group = (cur.student_ids as string[] | null) ?? [];
    if (b.notify && group.length) {
      const fmt = (t: number) => new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
      const n = await emailStudents(group, 'Your YAFT class has been rescheduled', 'Class rescheduled',
        `<p><strong>${escapeHtml(String(cur.title))}</strong> has moved.</p><p>Was: ${escapeHtml(fmt(new Date(cur.starts_at).getTime()))} IST<br>Now: <strong>${escapeHtml(fmt(newStart))} IST</strong>${targets.length > 1 ? `<br>The ${targets.length - 1} later class${targets.length > 2 ? 'es have' : ' has'} moved by the same amount.` : ''}</p><p>You can see every class and the Join button in your student portal.</p>`);
      emailed = n > 0;
    }
    return NextResponse.json({ ok: true, moved: targets.length, emailed });
  }
  if (b.action === 'update') {
    if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (b.meet_url !== undefined) { const u = cleanMeetUrl(b.meet_url); if (!u) return NextResponse.json({ error: 'Meeting link must be an https Google Meet, Zoom or Teams link.' }, { status: 400 }); patch.meet_url = u; }
    if (b.recording_url !== undefined) patch.recording_url = cleanHttps(b.recording_url);
    if (b.title !== undefined) { const t = cleanText(b.title, 120); if (!t) return NextResponse.json({ error: 'Title cannot be empty.' }, { status: 400 }); patch.title = t; }
    if (b.notes !== undefined) patch.notes = cleanText(b.notes, 500) || null;
    const { error } = await a.from('class_sessions').update(patch).eq('id', b.id);
    if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_session_updated', subject: b.id, detail: {} });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'mark_attendance') {
    if (!uuid(b.id) || !uuid(b.student_id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const { data: ses } = await a.from('class_sessions').select('id, course_slug, student_ids').eq('id', b.id).is('cancelled_at', null).maybeSingle();
    if (!ses) return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    const roster = await rosterBySlug();
    const only = ses.student_ids as string[] | null;
    if (!(roster[ses.course_slug] ?? []).some((e) => e.studentId === b.student_id) || (only && !only.includes(b.student_id))) return NextResponse.json({ error: 'That student is not part of this class.' }, { status: 400 });
    if (b.present) {
      const now = new Date().toISOString();
      const { data: prev } = await a.from('class_attendance').select('id').eq('session_id', b.id).eq('student_id', b.student_id).maybeSingle();
      if (!prev) await a.from('class_attendance').insert({ session_id: b.id, student_id: b.student_id, first_joined_at: now, last_joined_at: now, join_count: 0, source: 'manual', marked_by: who });
    } else {
      await a.from('class_attendance').delete().eq('session_id', b.id).eq('student_id', b.student_id);
    }
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_attendance_marked', subject: b.id, detail: { student_id: b.student_id, present: !!b.present } });
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'cancel') {
    if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const { data: gone } = await a.from('class_sessions').update({ cancelled_at: new Date().toISOString() }).eq('id', b.id).select('calendar_event_id').maybeSingle();
    if (gone?.calendar_event_id && meetConfigured()) await deleteMeetEvent(gone.calendar_event_id as string);
    await audit({ actor_type: 'admin', actor_ref: who, action: 'class_session_cancelled', subject: b.id, detail: {} });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
