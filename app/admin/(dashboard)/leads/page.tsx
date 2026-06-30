import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

type Lead = {
  id: string;
  email: string;
  name: string | null;
  linkedin_url: string | null;
  source: string | null;
  first_seen: string;
  last_seen: string;
};

async function getLeads(): Promise<{ leads: Lead[]; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const result = await safeQuery<Lead[]>(
    supabase
      .from('leads')
      .select('id, email, name, linkedin_url, source, first_seen, last_seen')
      .order('last_seen', { ascending: false }),
    [],
    'leads list'
  );
  return { leads: result.data, error: result.error };
}

export default async function AdminLeadsPage() {
  const { leads, error } = await getLeads();

  return (
    <>
      <h1 className={styles.sectionTitle}>Leads ({leads.length})</h1>

      {error && (
        <div style={{ background:'#2a0a0a', border:'1px solid #5a1a1a', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>
            Could not load leads: {error}
          </p>
        </div>
      )}

      {leads.length === 0 ? (
        <p className={styles.empty}>{error ? 'No data available right now.' : 'No leads yet.'}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>LinkedIn</th>
              <th>Source</th>
              <th>First seen</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.email}</td>
                <td>{lead.name ?? '—'}</td>
                <td>
                  {lead.linkedin_url ? (
                    <a href={lead.linkedin_url} target="_blank" rel="noopener" style={{ color: 'var(--blueprint)' }}>
                      Profile →
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{lead.source ?? '—'}</td>
                <td>{new Date(lead.first_seen).toLocaleDateString()}</td>
                <td>{new Date(lead.last_seen).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
