import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { upsertLead } from '@/lib/leads';
import { google } from 'googleapis';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YAFT_EMAIL = 'yaftdesigns@gmail.com';

async function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

function makeEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const lines = [
    `From: YAFT Designs <${YAFT_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
  ];
  return Buffer.from(lines.join('\n')).toString('base64url');
}

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

    // Send via Gmail API — appears in your Sent folder
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
      try {
        const gmail = await getGmailClient();

        // Email to student — lands in your Sent, they can reply directly
        const studentHtml = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <h2 style="margin-bottom:4px;">Thanks, ${name}.</h2>
  <p style="color:#555;font-size:14px;line-height:1.7;margin-bottom:16px;">
    We've received your enquiry${interest ? ` about <strong>${interest}</strong>` : ''} and will get back to you within 1–2 working days.
  </p>
  <p style="color:#555;font-size:14px;line-height:1.7;margin-bottom:20px;">
    Feel free to reply to this email directly — it comes straight to us.
  </p>
  <div style="background:#f8f8f8;border-left:3px solid #E63946;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:24px;">
    <p style="margin:0;font-size:12px;color:#888;">Your message</p>
    <p style="margin:8px 0 0;font-size:14px;color:#111;">${message.replace(/\n/g, '<br>')}</p>
  </div>
  <p style="color:#888;font-size:12px;">
    YAFT Designs · Authorized Rhino Training Center · Coimbatore, India<br>
    <a href="https://yaftdesigns.com" style="color:#E63946;">yaftdesigns.com</a>
  </p>
</div>`;

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: makeEmail({
              to: `${name} <${email}>`,
              subject: `Re: Your enquiry${interest ? ` about ${interest}` : ''} — YAFT Designs`,
              html: studentHtml,
            }),
          },
        });
      } catch (mailErr) {
        // Don't fail the whole request if email fails
        console.error('Gmail send failed:', mailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('enquiries insert failed', err);
    return NextResponse.json({ error: 'Could not save your enquiry. Please try again or email us directly.' }, { status: 502 });
  }
}
