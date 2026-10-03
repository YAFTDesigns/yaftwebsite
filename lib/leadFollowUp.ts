// Pure logic for the lead follow-up job (no I/O) so it can be unit tested.

export type LeadSource = 'syllabus_gate' | 'contact_form' | 'whatsapp_gate' | string;

const JUNK_LOCAL = /^(test|testing|tester|demo|sample|asdf|asd|qwe|qwerty|xxx|abc|abcd|noreply|no-reply)\d*$/i;
const JUNK_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'test.com', 'mailinator.com', 'tempmail.com']);

// Conservative: it is fine to wrongly skip a real address (the pilot is
// manually reviewed anyway); it is not fine to email obvious junk.
export function isJunkEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return true;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!domain.includes('.')) return true;
  if (JUNK_DOMAINS.has(domain)) return true;
  if (JUNK_LOCAL.test(local)) return true;
  // keyboard-mash style: a 2-3 character chunk repeated straight away (e.g. "hzhzh")
  if (/^([a-z]{2,3})\1/.test(local) && local.length <= 8) return true;
  return false;
}

export type LogRow = { to_email: string; status: string };

// Why failed sends must be tracked separately: the old rule skipped anyone
// with ANY earlier follow-up row, so one transient failure silently and
// permanently excluded that lead. Now only a send that actually went out
// (sent, or later marked bounced/complained by the webhook) counts as done;
// failures are retried, but at most MAX_FAILED_ATTEMPTS times.
export const MAX_FAILED_ATTEMPTS = 2;

export function summariseFollowUpLogs(rows: LogRow[]) {
  const done = new Set<string>();
  const failed = new Map<string, number>();
  for (const r of rows) {
    const e = r.to_email.trim().toLowerCase();
    if (r.status === 'failed') failed.set(e, (failed.get(e) ?? 0) + 1);
    else done.add(e);
  }
  return { done, failed };
}

export function daysAgo(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

export function selectionReason(c: { source: LeadSource; last_seen: string; course_interest: string | null; status: string }, now = Date.now()): string {
  const bits: string[] = [];
  bits.push(
    c.source === 'contact_form' ? 'wrote to us via the contact form'
      : c.source === 'syllabus_gate' ? 'unlocked a course syllabus'
      : c.source === 'whatsapp_gate' ? 'opened the WhatsApp gate'
      : `source ${c.source}`
  );
  if (c.course_interest) bits.push(`asked about ${c.course_interest}`);
  bits.push(`last active ${daysAgo(c.last_seen, now)} days ago`);
  bits.push(`status ${c.status}`);
  return bits.join(', ');
}

// Which wording a lead gets follows the strongest thing they actually did,
// not leads.source (which is overwritten by whichever capture came last).
// Anyone with an enquiry on record wrote to us, so they get enquiry wording.
export function contextSource(leadSource: LeadSource, hasEnquiry: boolean): LeadSource {
  return hasEnquiry ? 'contact_form' : leadSource;
}

export function formatEnquiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
}

// Contact-form first (they wrote to us), then those with a stated course
// interest, then most recently active.
export function rankCandidates<T extends { source: LeadSource; course_interest: string | null; last_seen: string }>(list: T[]): T[] {
  const w = (c: T) => (c.source === 'contact_form' ? 0 : 1) * 10 + (c.course_interest ? 0 : 1) * 5;
  return [...list].sort((a, b) => w(a) - w(b) || new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function utm(source: LeadSource, path: string): string {
  const q = new URLSearchParams({
    utm_source: 'yaft_email',
    utm_medium: 'email',
    utm_campaign: 'lead_follow_up',
    utm_content: String(source),
  });
  return `https://www.yaftdesigns.com${path}?${q.toString()}`;
}

// Wording follows what the person actually did. Gate activity is NOT
// described as a conversation: a syllabus unlock or a WhatsApp gate opening
// does not mean we ever spoke to them.
export function buildFollowUpEmail(c: { source: LeadSource; name: string | null; course_interest: string | null; enquiry_at?: string | null }): { subject: string; html: string } {
  const name = c.name?.trim() || null;
  const first = name ? name.split(/\s+/)[0] : null;
  const hi = first ? `Hi ${esc(first)},` : 'Hi,';
  const course = c.course_interest ? esc(c.course_interest) : null;

  let subject: string;
  let paras: string[];

  if (c.source === 'contact_form') {
    subject = course ? `Following up on your ${c.course_interest} enquiry` : 'Following up on your YAFT enquiry';
    paras = [
      `You wrote to YAFT Designs${c.enquiry_at ? ` on ${formatEnquiryDate(c.enquiry_at)}` : ' recently'}${course ? ` about <strong>${course}</strong>` : ''}. I wanted to check that you got what you needed.`,
      'If you still have questions about the course content, schedule or whether it fits your background, reply here and I will answer directly.',
    ];
  } else if (c.source === 'syllabus_gate') {
    subject = 'Did the YAFT syllabus answer your questions?';
    paras = [
      'You unlocked a course syllabus on the YAFT Designs website recently. I wanted to check whether it covered what you were looking for.',
      'If you tell me your background (student or working professional, and any Rhino or Grasshopper experience), I can suggest which course fits and what to skip.',
    ];
  } else if (c.source === 'whatsapp_gate') {
    subject = 'A question about YAFT courses?';
    paras = [
      'You recently started to contact YAFT Designs through the WhatsApp option on our website. If you did not get a chance to send a message, you are welcome to reply to this email instead.',
      'Tell me what you want to learn (Rhino, Grasshopper, or computational design for architecture) and I will point you to the right place.',
    ];
  } else {
    subject = 'Following up from YAFT Designs';
    paras = ['You recently got in touch with YAFT Designs through our website. I wanted to check whether you still have questions.'];
  }

  const labs = utm(c.source, '/labs');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">${hi}</p>
${paras.map((p) => `  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">${p}</p>`).join('\n')}
  <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">If you would like to try our work first, there are free Grasshopper and Rhino scripts on <a href="${labs}" style="color:#E63946;">YAFT Labs</a>.</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 24px;">Not the right time? Just reply "no thanks" and I will not follow up again.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">
    Yokes Marapa &middot; YAFT Designs &middot; Authorized Rhino Training Center &middot; Coimbatore, India<br>
    <a href="${utm(c.source, '/')}" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a>
  </p>
</div>`;
  return { subject, html };
}
