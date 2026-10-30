import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type InterestEvent = 'viewed' | 'enroll_clicked' | 'checkout_started' | 'enrolled';

/** Has this student's LATEST choice for course-interest tracking been "yes"? Default is no. */
export async function interestTrackingOn(studentId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin().from('student_consents').select('granted').eq('student_id', studentId).eq('purpose', 'course_interest_tracking').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data?.granted === true;
}

/** Signed-in course interest: one row per (student, course, event, day), only if the student opted in. A page view is never marketing consent. */
export async function recordInterest(studentId: string, courseSlug: string, event: InterestEvent): Promise<void> {
  try {
    if (!/^[a-z0-9-]{1,80}$/.test(courseSlug) || !(await interestTrackingOn(studentId))) return;
    await getSupabaseAdmin().from('course_interest_events').upsert({ student_id: studentId, course_slug: courseSlug, event }, { onConflict: 'student_id,course_slug,event,day', ignoreDuplicates: true });
  } catch (e) { console.error('[interest] failed:', e); }
}
