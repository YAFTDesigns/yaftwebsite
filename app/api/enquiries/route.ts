import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { upsertLead } from '@/lib/leads';
import { Resend } from 'resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YAFT_EMAIL = 'yaftdesigns@gmail.com';
const YAFT_FROM  = 'YAFT Designs <enquiries@yaftdesigns.com>';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name     = typeof body?.name     === 'string' ? body.name.trim()     : '';
  const email    = typeof body?.email    === 'string' ? body.email.trim()    : '';
  const interest = typeof body?.interest === 'string' ? body.interest.trim() : '';
  const message  = typeof body?.message  === 'string' ? body.message.trim()  : '';

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

    // Send emails via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // 1. Notify you
      await resend.emails.send({
        from: YAFT_FROM,
        to: YAFT_EMAIL,
        replyTo: email,
        subject: `New enquiry from ${name} — ${interest || 'General'}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
            <h2 style="margin-bottom:4px;">New Enquiry</h2>
            <p style="color:#888;font-size:13px;margin-bottom:24px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#888;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#E63946;">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#888;">Interested in</td><td style="padding:8px 0;">${interest || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#888;vertical-align:top;">Message</td><td style="padding:8px 0;">${message.replace(/\n/g, '<br>')}</td></tr>
            </table>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
              <a href="mailto:${email}?subject=Re: Your enquiry to YAFT Designs" style="background:#E63946;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Reply to ${name} →</a>
            </div>
          </div>
        `,
      });

      // 2. Confirm to student
      await resend.emails.send({
        from: YAFT_FROM,
        to: email,
        replyTo: YAFT_EMAIL,
        subject: `Your enquiry to YAFT Designs — we'll be in touch`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
            <h2 style="margin-bottom:4px;">Thanks, ${name}.</h2>
            <p style="color:#555;font-size:14px;line-height:1.7;margin-bottom:20px;">
              We've received your enquiry${interest ? ` about <strong>${interest}</strong>` : ''} and will get back to you within 1–2 working days.
            </p>
            <p style="color:#555;font-size:14px;line-height:1.7;margin-bottom:20px;">
              In the meantime, feel free to reply to this email directly — it goes straight to Yokes.
            </p>
            <div style="background:#f8f8f8;border-left:3px solid #E63946;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#888;">Your message</p>
              <p style="margin:8px 0 0;font-size:14px;color:#111;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color:#888;font-size:12px;">
              YAFT Designs · Authorized Rhino Training Center · Coimbatore, India<br>
              <a href="https://yaftdesigns.com" style="color:#E63946;">yaftdesigns.com</a>
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('enquiries insert failed', err);
    return NextResponse.json({ error: 'Could not save your enquiry. Please try again or email us directly.' }, { status: 502 });
  }
}
