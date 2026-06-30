import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { upsertLead } from '@/lib/leads';
import { getCourseBySlug } from '@/lib/courses';
import { rateLimit } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /linkedin\.com\//i;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const emailRaw = typeof body?.email === 'string' ? body.email.trim() : '';
  const linkedinRaw = typeof body?.linkedin === 'string' ? body.linkedin.trim() : '';
  const slug = typeof body?.slug === 'string' ? body.slug : '';

  const emailOk = EMAIL_RE.test(emailRaw);
  const linkedinOk = LINKEDIN_RE.test(linkedinRaw);
  if (!emailOk && !linkedinOk) {
    return NextResponse.json({ error: 'An email or LinkedIn URL is required.' }, { status: 400 });
  }
  const email = emailOk ? emailRaw : null;
  const linkedin = linkedinOk ? linkedinRaw : null;

  let course;
  try {
    course = await getCourseBySlug(slug);
  } catch (err) {
    console.error('syllabus/access course lookup failed', err);
    return NextResponse.json({ error: 'Could not look up course.' }, { status: 502 });
  }
  if (!course) {
    return NextResponse.json({ error: 'Unknown course.' }, { status: 404 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const leadId = await upsertLead(supabase, { email, linkedinUrl: linkedin, source: 'syllabus_gate' });

    await supabase.from('syllabus_requests').insert({
      lead_id: leadId,
      course_slug: course.slug,
    });

    // Phase 1: PDFs are still served from /public. Phase 2 swaps this for a
    // short-lived Supabase Storage signed URL instead of a static path.
    return NextResponse.json({ url: course.pdf });
  } catch (err) {
    console.error('syllabus/access failed', err);
    // Lead capture/logging is best-effort from the visitor's point of view —
    // don't block access to a PDF that's still public just because the DB write failed.
    return NextResponse.json({ url: course.pdf, warning: 'lead-not-recorded' });
  }
}
