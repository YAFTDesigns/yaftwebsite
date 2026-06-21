import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const VALID_EVENTS = new Set(['page_view', 'syllabus_modal_open', 'syllabus_unlock', 'enquiry_submit']);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const eventType = typeof body?.eventType === 'string' ? body.eventType : '';
  const page = typeof body?.page === 'string' ? body.page : null;
  const courseSlug = typeof body?.courseSlug === 'string' ? body.courseSlug : null;
  const meta = body?.meta && typeof body.meta === 'object' ? body.meta : null;

  if (!sessionId || !VALID_EVENTS.has(eventType)) {
    return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('analytics_events').insert({
      session_id: sessionId,
      event_type: eventType,
      page,
      course_slug: courseSlug,
      meta,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Analytics is fire-and-forget by design — never surface this as a user-facing error.
    console.error('analytics/event failed', err);
    return NextResponse.json({ ok: false });
  }
}
