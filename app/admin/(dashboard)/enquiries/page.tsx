import { getSupabaseAdmin } from '@/lib/supabase/admin';
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

async function getEnquiries(): Promise<Enquiry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('enquiries')
    .select('id, name, email, course_interest, message, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default async function AdminEnquiriesPage() {
  const enquiries = await getEnquiries();

  return (
    <>
      <h1 className={styles.sectionTitle}>Enquiries ({enquiries.length})</h1>
      {enquiries.length === 0 ? (
        <p className={styles.empty}>No enquiries yet.</p>
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
