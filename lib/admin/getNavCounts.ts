import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeCount } from '@/lib/admin/safeQuery';

/**
 * Small counts shown as red badges on the admin nav, so anything
 * needing attention (approvals, testimonials, failed mails) shows
 * up as a phone-style notification dot instead of its own dashboard
 * segment. Every query is wrapped in safeCount so a missing table
 * or RLS error just renders no badge instead of breaking the nav.
 */
export async function getNavCounts() {
  const supabase = getSupabaseAdmin();

  const [pendingTestimonials, pendingStudentWork, pendingPublications, failedEmails] =
    await Promise.all([
      safeCount(
        supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        'nav:testimonials'
      ),
      safeCount(
        supabase.from('student_work').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        'nav:student_work'
      ),
      safeCount(
        supabase.from('publications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        'nav:publications'
      ),
      safeCount(
        supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
        'nav:email_logs'
      ),
    ]);

  return {
    pendingTestimonials: pendingTestimonials.data,
    pendingApprovals: pendingStudentWork.data + pendingPublications.data,
    failedEmails: failedEmails.data,
  };
}
