import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { buildEnrolmentCard, type PlanRow } from './enrolmentView';
import type { PlanKind } from '@/lib/coursePayments';

export const JOIN_OPENS_MIN_BEFORE = 15;
export const JOIN_CLOSES_MIN_AFTER = 30;

export type ClassView = {
  id: string; courseSlug: string; title: string; startsAt: string; endsAt: string; notes: string | null;
  recordingUrl: string | null; isPrivate: boolean; state: 'upcoming' | 'open' | 'past'; attended: boolean; joinedAt: string | null;
};
export type ClassesView = { sessions: ClassView[]; attendance: Record<string, { held: number; attended: number }> };

/** Course slugs this student may attend: their linked plans that are paid at least in part (or legacy bills) and not cancelled. */
export async function activeSlugsFor(studentId: string): Promise<Set<string>> {
  const admin = getSupabaseAdmin();
  const { data: links } = await admin.from('student_enrolments').select('plan_id').eq('student_id', studentId);
  const planIds = (links ?? []).map((l) => l.plan_id as string);
  const out = new Set<string>();
  if (!planIds.length) return out;
  const [plans, pays] = await Promise.all([
    admin.from('course_payment_plans').select('id, status, description, course_slugs, currency, is_test, structure, base_total, advance_base, source').in('id', planIds),
    admin.from('course_payments').select('plan_id, kind').in('plan_id', planIds).eq('status', 'paid'),
  ]);
  for (const p of plans.data ?? []) {
    const kinds = (pays.data ?? []).filter((x) => x.plan_id === p.id).map((x) => x.kind as PlanKind);
    const card = buildEnrolmentCard(p as unknown as PlanRow, kinds);
    if (card.payStatus === 'cancelled' || card.payStatus === 'unpaid') continue;
    for (const s of card.courseSlugs) out.add(s);
  }
  return out;
}

export function stateOf(startsAt: string, endsAt: string, now = Date.now()): 'upcoming' | 'open' | 'past' {
  const s = new Date(startsAt).getTime(), e = new Date(endsAt).getTime();
  if (now < s - JOIN_OPENS_MIN_BEFORE * 60_000) return 'upcoming';
  if (now <= e + JOIN_CLOSES_MIN_AFTER * 60_000) return 'open';
  return 'past';
}

/** Never includes the meeting link. */
export async function loadClasses(studentId: string, slugs: Set<string>): Promise<ClassesView> {
  if (!slugs.size) return { sessions: [], attendance: {} };
  const admin = getSupabaseAdmin();
  const { data: rows } = await admin.from('class_sessions').select('id, course_slug, title, starts_at, ends_at, notes, recording_url, student_ids')
    .in('course_slug', [...slugs]).is('cancelled_at', null).or(`student_ids.is.null,student_ids.cs.{${studentId}}`).order('starts_at', { ascending: true }).limit(300);
  const ids = (rows ?? []).map((r) => r.id as string);
  const { data: att } = ids.length ? await admin.from('class_attendance').select('session_id, first_joined_at').eq('student_id', studentId).in('session_id', ids) : { data: [] as { session_id: string; first_joined_at: string }[] };
  const joined = new Map((att ?? []).map((a) => [a.session_id, a.first_joined_at]));
  const sessions: ClassView[] = (rows ?? []).map((r) => {
    const state = stateOf(r.starts_at, r.ends_at);
    return { id: r.id, courseSlug: r.course_slug, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at, notes: r.notes, recordingUrl: state === 'past' ? r.recording_url : null, isPrivate: !!r.student_ids, state, attended: joined.has(r.id), joinedAt: joined.get(r.id) ?? null };
  });
  const attendance: Record<string, { held: number; attended: number }> = {};
  for (const s of sessions) {
    if (s.state !== 'past') continue;
    const a = (attendance[s.courseSlug] ??= { held: 0, attended: 0 });
    a.held += 1;
    if (s.attended) a.attended += 1;
  }
  return { sessions, attendance };
}

const HOSTS = [/^meet\.google\.com$/, /(^|\.)zoom\.us$/, /^teams\.microsoft\.com$/, /^teams\.live\.com$/];
/** Only https links to the known meeting providers; anything else is rejected. */
export function cleanMeetUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== 'https:' || !HOSTS.some((h) => h.test(u.hostname))) return null;
    return u.toString().slice(0, 400);
  } catch { return null; }
}
/** Recording or notes link: any https link. */
export function cleanHttps(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  try { const u = new URL(v.trim()); return u.protocol === 'https:' ? u.toString().slice(0, 400) : null; } catch { return null; }
}
