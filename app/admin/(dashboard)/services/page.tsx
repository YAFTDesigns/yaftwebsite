import { getSupabaseAdmin } from '@/lib/supabase/admin';
import ServicesImagesClient from './ServicesImagesClient';

export const dynamic = 'force-dynamic';

const SERVICE_LABELS: Record<string, string> = {
  'parametric-facade': '01 · Parametric facade fabrication',
  'shop-drawing': '02 · Shop drawing automation',
  'college-workshops': '03 · College workshops',
  'corporate-training': '04 · Corporate training for architectural firms',
};
const ORDER = ['parametric-facade', 'shop-drawing', 'college-workshops', 'corporate-training'];

export default async function AdminServicesPage() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('service_images').select('*');
  const byKey = new Map((data ?? []).map((r) => [r.service_key, r]));
  const rows = ORDER.map((key) => ({
    key,
    label: SERVICE_LABELS[key],
    image_path: byKey.get(key)?.image_path ?? null,
    caption: byKey.get(key)?.caption ?? '',
  }));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, marginBottom: 6 }}>Services page images</h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 32 }}>
        The hero image shown for each of the 4 fixed services on /services. Replacing an image here updates the live public page immediately.
      </p>
      {error && <p style={{ color: '#e55', fontFamily: 'var(--mono)', fontSize: 13 }}>Failed to load: {error.message}</p>}
      <ServicesImagesClient initialRows={rows} />
    </div>
  );
}
