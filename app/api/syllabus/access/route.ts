import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { upsertLead } from '@/lib/leads';
import { getCourseBySlug } from '@/lib/courses';
import { rateLimit } from '@/lib/rateLimit';
import { google } from 'googleapis';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /linkedin\.com\//i;
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
  const limited = rateLimit(request, { limit: 5, windowMs: 60000 });
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const emailRaw = typeof body?.email === 'string' ? body.email.trim() : '';
  const linkedinRaw = typeof body?.linkedin === 'string' ? body.linkedin.trim() : '';
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;

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
    const leadId = await upsertLead(supabase, { email, linkedinUrl: linkedin, source: 'syllabus_gate', sessionId });

    await supabase.from('syllabus_requests').insert({
      lead_id: leadId,
      course_slug: course.slug,
    });

    // Send confirmation email, best-effort: a failure here shouldn't block
    // access to a syllabus PDF that's still publicly reachable anyway.
    if (email && process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
      let status = 'sent';
      let errMsg = null;
      let subject = '';
      try {
        const { data: tmpl } = await supabase
          .from('email_templates')
          .select('subject, body_html')
          .eq('key', 'syllabus_confirmation')
          .single();

        const vars = { course_title: course.title };
        subject = renderTemplate(tmpl?.subject ?? '{{course_title}} syllabus - YAFT Designs', vars);
        const html = renderTemplate(tmpl?.body_html ?? `<p>Thanks for checking out ${course.title}.</p>`, vars);

        const gmail = await getGmailClient();
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: makeEmail({ to: email, subject, html }) },
        });
      } catch (mailErr: any) {
        status = 'failed';
        errMsg = mailErr?.message ?? 'Unknown error';
        console.error('syllabus confirmation Gmail send failed:', mailErr);
      }

      await supabase.from('email_logs').insert({
        to_email: email,
        to_name: email.split('@')[0],
        subject,
        template: 'syllabus_confirmation',
        status,
        error: errMsg,
      });
    }

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
