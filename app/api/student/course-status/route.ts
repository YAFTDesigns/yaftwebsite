import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { buildEnrolmentCard, type PlanRow } from '@/lib/student/enrolmentView';
import type { PlanKind } from '@/lib/coursePayments';

// For the course page buttons: is the signed-in student already enrolled in this course, and what is the next step? Anonymous gets {signedIn:false}.
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  const H = { 'Cache-Control': 'private, no-store' };
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.json({ error: 'Bad request' }, { status: 400, headers: H });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ signedIn: false }, { headers: H });
  const a = getSupabaseAdmin();
  const { data: links } = await a.from('student_enrolments').select('plan_id').eq('student_id', s.profile.id);
  const ids = (links ?? []).map((l) => l.plan_id as string);
  if (!ids.length) return NextResponse.json({ signedIn: true, enrolled: false }, { headers: H });
  const [{ data: plans }, { data: pays }] = await Promise.all([
    a.from('course_payment_plans').select('id, token, status, description, course_slugs, currency, is_test, structure, base_total, advance_base').in('id', ids).contains('course_slugs', [slug]),
    a.from('course_payments').select('plan_id, kind').in('plan_id', ids).eq('status', 'paid'),
  ]);
  for (const p of plans ?? []) {
    const card = buildEnrolmentCard(p as unknown as PlanRow, (pays ?? []).filter((x) => x.plan_id === p.id).map((x) => x.kind as PlanKind));
    if (card.payStatus === 'unpaid' || card.payStatus === 'cancelled') continue; // pending checkout is not an enrolment
    return NextResponse.json({ signedIn: true, enrolled: true, nextAction: card.nextAction, payUrl: `/pay/${p.token}` }, { headers: H });
  }
  return NextResponse.json({ signedIn: true, enrolled: false }, { headers: H });
}
