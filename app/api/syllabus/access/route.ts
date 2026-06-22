import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { upsertLead } from '@/lib/leads';
import { getCourseBySlug } from '@/lib/courses';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /linkedin\.com\//i;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const linkedin = typeof body?.linkedin === 'string' ? body.linkedin.trim() : '';
  const slug = typeof body?.slug === 'string' ? body.slug : '';

  if (!EMAIL_RE.test(email) || !LINKEDIN_RE.test(linkedin)) {
    return NextResponse.json({ error: 'A valid email and LinkedIn URL are required.' }, { status: 400 });
  }

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
