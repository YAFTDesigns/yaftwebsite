import { NextRequest, NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Resend event payload shape (email.bounced/complained/failed), per
// https://resend.com/docs/webhooks/emails/bounced -- only the fields
// this route actually reads.
type ResendWebhookEvent = {
  type: string;
  data: {
    email_id: string;
    to: string[];
    bounce?: { message: string; subType: string; type: string };
  };
};

// This is what makes the "125 views but nothing in the breakdown"
// class of silent failure visible for email specifically: Resend's
// API accepting a send (status 'sent' in email_logs) only means the
// request was accepted, not that the email reached an inbox. A bad
// address like Pulkit's bounces *after* that point, and without this
// webhook, email_logs shows a false "sent" forever.
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  // Must be the raw body text -- Resend's signature is computed over
  // the exact bytes sent. Re-serializing a parsed-then-stringified
  // JSON object breaks verification even when the content is
  // logically identical, a documented, easy-to-hit mistake.
  const payload = await request.text();

  let event: ResendWebhookEvent;
  try {
    const resend = getResendClient();
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      },
      webhookSecret,
    }) as ResendWebhookEvent;
  } catch (err) {
    console.error('[resend-webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // email.delivery_delayed is deliberately not handled here -- Resend's
  // own docs describe it as a temporary condition (a full inbox, a
  // transient receiving-server issue) that may still resolve, so
  // marking it as a failure in email_logs would be premature.
  const statusByType: Record<string, string> = {
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.failed': 'failed',
  };
  const newStatus = statusByType[event.type];
  if (!newStatus) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const errorDetail = event.data.bounce?.message ?? event.type;
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from('email_logs')
    .update({ status: newStatus, error: errorDetail }, { count: 'exact' })
    .eq('resend_email_id', event.data.email_id);

  if (error) {
    console.error('[resend-webhook] email_logs update failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    // Real possibility for anything sent before this feature shipped
    // (no resend_email_id stored yet) -- not an error, just nothing to
    // match against.
    console.warn(`[resend-webhook] no email_logs row matched email_id ${event.data.email_id}`);
  }

  return NextResponse.json({ ok: true, matched: count ?? 0 });
}
