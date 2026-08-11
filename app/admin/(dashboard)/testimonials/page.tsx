import TestimonialsClient from './TestimonialsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Server-fetches the default 'pending' filter so first paint has content
// instead of an empty shell + client fetch after hydration. Switching
// filters (approved/rejected) still fetches client-side as before.
export default async function TestimonialsPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('testimonials').select('*').eq('status', 'pending').order('submitted_at', { ascending: false });
  return <TestimonialsClient initialItems={data ?? []} initialFilter="pending" />;
}
