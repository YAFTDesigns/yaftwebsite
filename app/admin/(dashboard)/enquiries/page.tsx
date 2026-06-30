import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

type Enquiry = {
  id: string;
  name: string;
  email: string;
  course_interest: string | null;
  message: string | null;
  created_at: string;
};

async function getEnquiries(): Promise<{ enquiries: Enquiry[]; error: string | null }> {
  const supabase = getSupabaseAdmin();
  const result = await safeQuery<Enquiry[]>(
    supabase
      .from('enquiries')
      .select('id, name, email, course_interest, message, created_at')
      .order('created_at', { ascending: false }),
    [],
    'enquiries list'
  );
  return { enquiries: result.data, error: result.error };
}

export default async function AdminEnquiriesPage() {
  const { enquiries, error } = await getEnquiries();

  return (
    <>
      <h1 className={styles.sectionTitle}>Enquiries ({enquiries.length})</h1>

      {error && (
        <div style={{ background:'#2a0a0a', border:'1px solid #5a1a1a', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>
            Could not load enquiries: {error}
          </p>
        </div>
      )}

      {enquiries.length === 0 ? (
        <p className={styles.empty}>{error ? 'No data available right now.' : 'No enquiries yet.'}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Interested in</th>
              <th>Message</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enq) => (
              <tr key={enq.id}>
                <td>{enq.name}</td>
                <td>{enq.email}</td>
                <td>{enq.course_interest ?? '—'}</td>
                <td style={{ maxWidth: 320 }}>{enq.message ?? '—'}</td>
                <td>{new Date(enq.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
