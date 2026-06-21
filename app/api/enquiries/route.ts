import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { upsertLead } from '@/lib/leads';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const interest = typeof body?.interest === 'string' ? body.interest.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!name || !EMAIL_RE.test(email) || !message) {
    return NextResponse.json({ error: 'Name, a valid email, and a message are required.' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const leadId = await upsertLead(supabase, { email, name, source: 'contact_form' });

    const { error } = await supabase.from('enquiries').insert({
      lead_id: leadId,
      name,
      email,
      course_interest: interest || null,
      message,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('enquiries insert failed', err);
    return NextResponse.json({ error: 'Could not save your enquiry. Please try again or email us directly.' }, { status: 502 });
  }
}
