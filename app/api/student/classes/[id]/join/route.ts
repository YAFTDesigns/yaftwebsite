import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { rateLimitShared } from '@/lib/rateLimitShared';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { activeSlugsFor, stateOf } from '@/lib/student/classes';

const back = (req: NextRequest, why: string) => NextResponse.redirect(new URL(`/student?class=${why}`, req.url), 303);

// Students press Join (a form POST). We check they hold the course and the class is open, log the join, then send them to the meeting.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.redirect(new URL('/student', req.url), 303);
  const limited = await rateLimitShared(req, 'student-class-join', { limit: 30, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back(req, 'invalid');
  const admin = getSupabaseAdmin();
  const { data: c } = await admin.from('class_sessions').select('id, course_slug, starts_at, ends_at, meet_url, cancelled_at, student_ids').eq('id', id).maybeSingle();
  if (!c || c.cancelled_at || (c.student_ids && !(c.student_ids as string[]).includes(s.profile.id))) return back(req, 'invalid');
  if (!(await activeSlugsFor(s.profile.id)).has(c.course_slug)) return back(req, 'notenrolled');
  const st = stateOf(c.starts_at, c.ends_at);
  if (st !== 'open') return back(req, st === 'upcoming' ? 'notyet' : 'ended');
  const now = new Date().toISOString();
  const { data: prev } = await admin.from('class_attendance').select('id, join_count').eq('session_id', c.id).eq('student_id', s.profile.id).maybeSingle();
  if (prev) await admin.from('class_attendance').update({ last_joined_at: now, join_count: (prev.join_count as number) + 1 }).eq('id', prev.id);
  else await admin.from('class_attendance').upsert({ session_id: c.id, student_id: s.profile.id, first_joined_at: now, last_joined_at: now, join_count: 1 }, { onConflict: 'session_id,student_id', ignoreDuplicates: true });
  return NextResponse.redirect(c.meet_url, 303);
}
