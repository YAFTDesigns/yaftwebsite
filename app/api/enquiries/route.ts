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

function renderTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
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

  const supabase = getSupabaseAdmin();

  try {
    const leadId = await upsertLead(supabase, { email, name, source: 'contact_form' });

    const { data: enquiryRow, error } = await supabase
      .from('enquiries')
      .insert({ lead_id: leadId, name, email, course_interest: interest || null, message })
      .select('id')
      .single();
    if (error) throw error;

    const enquiryId = enquiryRow?.id ?? null;

    // Send via Gmail API
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
      let status = 'sent';
      let errMsg = null;
      let subject = '';

      try {
        // Fetch template from DB
        const { data: tmpl } = await supabase
          .from('email_templates')
          .select('subject, body_html')
          .eq('key', 'enquiry_confirmation')
          .single();

        const vars = {
          name,
          interest: interest ? ` about ${interest}` : '',
          interest_line: interest ? ` about <strong>${interest}</strong>` : '',
          message: message.replace(/\n/g, '<br>'),
        };

        subject = renderTemplate(tmpl?.subject ?? 'Re: Your enquiry - YAFT Designs', vars);
        const defaultHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Hi {{name}},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Thank you for your enquiry{{interest_line}}.</p>
  <table style="font-size:14px;line-height:1.9;margin:0 0 20px;border-collapse:collapse;width:100%;">
    <tr>
      <td style="color:#555;padding:4px 16px 4px 0;vertical-align:top;white-space:nowrap;">Training schedule</td>
      <td style="padding:4px 0;color:#111;">10 hrs/week across 3 consecutive sessions. Total duration depends on course level — full details on <a href="https://yaftdesigns.com/courses" style="color:#E63946;text-decoration:none;">yaftdesigns.com/courses</a>.</td>
    </tr>
    <tr>
      <td style="color:#555;padding:4px 16px 4px 0;vertical-align:top;white-space:nowrap;">Group discount</td>
      <td style="padding:4px 0;color:#111;">Available for a minimum batch of 3. Reply to this email to avail.</td>
    </tr>
  </table>
  <img src="https://yaftdesigns.com/assets/images/rhino-banner.png" alt="Rhinoceros — design, model, present, analyze, realize" width="560" style="width:100%;max-width:560px;display:block;margin:0 0 20px;" />
  <p style="font-size:14px;line-height:1.8;margin:0 0 24px;">Reply to this email to confirm your slot or ask any questions.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">
    This is an automated message from YAFT Designs.<br>
    Authorized Rhino Training Center · Coimbatore, India<br>
    <a href="https://yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a>
  </p>
</div>`;

        const html = renderTemplate(tmpl?.body_html ?? defaultHtml, vars);

        const gmail = await getGmailClient();
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: makeEmail({ to: `${name} <${email}>`, subject, html }) },
        });
      } catch (mailErr: any) {
        status = 'failed';
        errMsg = mailErr?.message ?? 'Unknown error';
        console.error('Gmail send failed:', mailErr);
      }

      // Log the email
      await supabase.from('email_logs').insert({
        to_email: email,
        to_name: name,
        subject,
        template: 'enquiry_confirmation',
        status,
        error: errMsg,
        enquiry_id: enquiryId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('enquiries insert failed', err);
    return NextResponse.json({ error: 'Could not save your enquiry. Please try again or email us directly.' }, { status: 502 });
  }
}
