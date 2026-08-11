import InvoicesClient from './InvoicesClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Create tab (the default) is just a form, doesn't need list data. But
// two things fetched unconditionally on every mount regardless of tab:
// the client picker dropdown and the trash list (for its badge count).
// Server-fetching both removes those round trips from every single
// visit to this page.
export default async function InvoicesPage() {
  const supabase = getSupabaseAdmin();
  const [clientsRes, trashRes] = await Promise.all([
    supabase.from('clients').select('id, name, company_name, gstin, email, phone, address').is('deleted_at', null).order('name', { ascending: true }),
    supabase.from('invoices').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
  ]);
  return (
    <InvoicesClient
      initialClientOptions={clientsRes.data ?? []}
      initialTrashedInvoices={trashRes.data ?? []}
    />
  );
}
