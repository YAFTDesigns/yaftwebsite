import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { upsertLead } from '@/lib/leads';
import { rateLimit } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fair trade for the WhatsApp button: we ask for an email before handing
// over the redirect to wa.me, same principle as the syllabus gate, except
// email is mandatory here rather than email-or-LinkedIn -- the whole
// point is knowing who's about to message, not just tracking a click.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    await upsertLead(supabase, { email, source: 'whatsapp_gate', sessionId });
  } catch (err) {
    // Lead capture is best-effort from the visitor's point of view -- a
    // failed DB write shouldn't strand someone who just wants to chat.
    console.error('whatsapp/access lead capture failed', err);
  }

  const text = typeof body?.text === 'string' ? body.text : "Hi, I'm interested in your Rhino3D and Grasshopper courses.";
  return NextResponse.json({ url: `/api/wa?text=${encodeURIComponent(text)}` });
}
