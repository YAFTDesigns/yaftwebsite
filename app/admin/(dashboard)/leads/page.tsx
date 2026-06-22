import { getSupabaseAdmin } from '@/lib/supabase/admin';
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

async function getLeads(): Promise<Lead[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('leads')
    .select('id, email, name, linkedin_url, source, first_seen, last_seen')
    .order('last_seen', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default async function AdminLeadsPage() {
  const leads = await getLeads();

  return (
    <>
      <h1 className={styles.sectionTitle}>Leads ({leads.length})</h1>
      {leads.length === 0 ? (
        <p className={styles.empty}>No leads yet.</p>
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
