import { getSupabaseAdmin } from '@/lib/supabase/admin';
import BdLeadsClient, { type BdLead } from './BdLeadsClient';

export const dynamic = 'force-dynamic';

export default async function AdminBdLeadsPage() {
  const { data, error } = await getSupabaseAdmin()
    .from('bd_leads')
    .select('*')
    .order('updated_at', { ascending: false });

  // Sorted by actual priority (high -> medium -> low) here in JS
  // rather than at the query level -- ordering by the text column
  // directly would sort alphabetically (high, low, medium), not by
  // real priority.
  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...(data ?? [])].sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, marginBottom: 6 }}>BD Leads</h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 28 }}>
        Institutions and companies to approach — separate from website Leads, which tracks inbound visitors.
      </p>
      {error && <p style={{ color: '#e55', fontFamily: 'var(--mono)', fontSize: 13 }}>Failed to load: {error.message}</p>}
      <BdLeadsClient initialLeads={sorted as BdLead[]} />
    </div>
  );
}
