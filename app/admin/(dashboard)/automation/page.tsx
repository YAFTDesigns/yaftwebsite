import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAutomationSnapshot } from '@/lib/cronControls';
import AutomationClient, { type AutomationData } from './AutomationClient';

export const dynamic = 'force-dynamic';

export default async function AdminAutomationPage() {
  const supabase = getSupabaseAdmin();
  const { controls, queues, due } = await getAutomationSnapshot(supabase);

  const initial: AutomationData = { controls: (controls ?? []) as AutomationData['controls'], queues, due_scheduled_invoices: due };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, marginBottom: 6 }}>Automation</h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 28 }}>
        Operational controls for scheduled jobs, previews and retry queues. Customer-facing follow-up remains explicitly controlled; use preview/test before enabling live sends.
      </p>
      <AutomationClient initial={initial} />
    </div>
  );
}
