import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, isEmailConfigured, escapeHtml } from '@/lib/email';
import { brandedEmail } from '@/lib/emailLayout';

/**
 * Sent once when a course payment is confirmed. Goes to the email the student signed in to the portal with (their student login);
 * only if the plan is not linked to a student account yet does it fall back to the billing email on the plan.
 * Says either "your next class is ..." or "your schedule and Meet link are being prepared". Never contains the Meet link.
 */
export async function sendPaymentClassEmail(plan: { id: string; client_name: string; client_email: string; description: string; course_slugs: string[] | null }, testMode: boolean): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    const a = getSupabaseAdmin();
    let to = plan.client_email;
    let studentId: string | null = null;
    let display = plan.client_name;
    const { data: link } = await a.from('student_enrolments').select('student_id, students(user_id, display_name)').eq('plan_id', plan.id).maybeSingle();
    const st = link?.students as unknown as { user_id: string; display_name: string | null } | { user_id: string; display_name: string | null }[] | null | undefined;
    const stu = Array.isArray(st) ? st[0] : st;
    if (link && stu) {
      const { data: u } = await a.auth.admin.getUserById(stu.user_id);
      if (u?.user?.email) { to = u.user.email; studentId = link.student_id as string; display = stu.display_name || plan.client_name; }
    }
    const slugs = plan.course_slugs ?? [];
    let next: { title: string; starts_at: string } | null = null;
    if (slugs.length) {
      let q = a.from('class_sessions').select('title, starts_at').in('course_slug', slugs).is('cancelled_at', null).gt('starts_at', new Date().toISOString()).order('starts_at').limit(1);
      q = studentId ? q.or(`student_ids.is.null,student_ids.cs.{${studentId}}`) : q.is('student_ids', null);
      const { data } = await q;
      next = data?.[0] ?? null;
    }
    const when = next ? new Date(next.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
    const body = next
      ? `<p>Thank you, your payment for <strong>${escapeHtml(plan.description)}</strong> is confirmed.</p><p>Your next class: <strong>${escapeHtml(next.title)}</strong>, ${escapeHtml(when)} IST.</p><p>Sign in to your student portal and open <strong>Classes</strong>. The Join button opens 15 minutes before each class, and your attendance is recorded when you join.</p>`
      : `<p>Thank you, your payment for <strong>${escapeHtml(plan.description)}</strong> is confirmed.</p><p>Your class schedule and Meet link are being prepared. We will email you as soon as they are ready. They will appear in your student portal under <strong>Classes</strong>, with a Join button.</p>`;
    await sendEmail({
      to,
      subject: `${testMode ? '[TEST] ' : ''}Payment received: your YAFT classes`,
      html: brandedEmail({ heading: 'Payment received', bodyHtml: `<p>Hi ${escapeHtml(display || 'there')},</p>${body}<p style="font-size:12px;color:#888;">Sign in to the portal with this email address.</p>`, cta: { label: 'Open student portal', href: 'https://www.yaftdesigns.com/student' } }),
    });
  } catch (e) { console.error('[course-payment] class email failed:', e); }
}
