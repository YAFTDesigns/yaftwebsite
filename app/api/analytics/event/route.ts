import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

const VALID_EVENTS = new Set(['page_view', 'syllabus_modal_open', 'syllabus_unlock', 'enquiry_submit', 'course_gate_open', 'course_gate_unlock', 'whatsapp_click', 'whatsapp_gate_open']);

// A recent scan showed bot/scanner traffic posting fabricated page
// values straight to this endpoint (e.g. base64-looking garbage,
// "/courses.Group") -- this endpoint has no auth, so anything can hit
// it directly, not just the site's own tracker. Only store page_view
// events whose page actually matches a real route on the site.
const VALID_PAGE_PATTERN = /^\/(courses|services|projects|projects\/community|faculty|resources|insights|certificates|consent|cookies|terms)?(\/[a-z0-9-]{1,80})?$/;

function isValidPage(page: string | null): boolean {
  if (page === null) return true; // some event types don't send a page
  if (page.length > 200) return false;
  return VALID_PAGE_PATTERN.test(page);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 30, windowMs: 60000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const eventType = typeof body?.eventType === 'string' ? body.eventType : '';
  const page = typeof body?.page === 'string' ? body.page : null;
  const courseSlug = typeof body?.courseSlug === 'string' ? body.courseSlug : null;
  const meta = body?.meta && typeof body.meta === 'object' ? body.meta : null;
  const referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 2048) : null;
  const utmSource = typeof body?.utmSource === 'string' ? body.utmSource.slice(0, 200) : null;
  const utmMedium = typeof body?.utmMedium === 'string' ? body.utmMedium.slice(0, 200) : null;
  const utmCampaign = typeof body?.utmCampaign === 'string' ? body.utmCampaign.slice(0, 200) : null;
  const isInternal = body?.isInternal === true;

  if (!sessionId || !VALID_EVENTS.has(eventType)) {
    return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
  }
  if (!isValidPage(page)) {
    // Don't hint to whatever's probing this endpoint that it was
    // rejected for a specific reason -- just look like a normal
    // fire-and-forget success and drop it.
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = getSupabaseAdmin();

    // If this session has already identified as a lead (syllabus unlock,
    // contact form), tag the event so time-on-site can be computed later.
    let leadId: string | null = null;
    const { data: linked } = await supabase
      .from('lead_sessions')
      .select('lead_id')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (linked) leadId = linked.lead_id as string;

    const { error } = await supabase.from('analytics_events').insert({
      session_id: sessionId,
      lead_id: leadId,
      event_type: eventType,
      page,
      course_slug: courseSlug,
      meta,
      referrer,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      is_internal: isInternal,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Analytics is fire-and-forget by design — never surface this as a user-facing error.
    console.error('analytics/event failed', err);
    return NextResponse.json({ ok: false });
  }
}
