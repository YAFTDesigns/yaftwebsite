import { getSupabaseAdmin } from '@/lib/supabase/admin';
import LabsPageClient from './LabsPageClient';

export const metadata = {
  title: 'YAFT Labs — Free Grasshopper & Rhino Scripts | YAFT Designs',
  description: 'Small Grasshopper and Rhino scripts from YAFT Designs reels and projects. Free to download.',
};

export const dynamic = 'force-dynamic';

export type LabScript = {
  id: string; title: string; description: string; category_id: string | null;
  price: number; file_path: string | null; thumbnail_path: string | null; detail_image_path: string | null;
  youtube_url: string | null;
  download_count: number; view_count: number; updated_at: string;
};

export type LabCategory = { id: string; name: string; display_order: number };

export default async function LabsPage() {
  const supabase = getSupabaseAdmin();
  const [scriptsRes, categoriesRes] = await Promise.all([
    supabase
      .from('lab_scripts')
      .select('id, title, description, category_id, price, file_path, thumbnail_path, detail_image_path, youtube_url, download_count, view_count, updated_at')
      .eq('active', true)
      .is('deleted_at', null)
      .not('file_path', 'is', null)
      .order('display_order'),
    supabase.from('lab_categories').select('id, name, display_order').order('display_order'),
  ]);

  if (scriptsRes.error) console.error('[labs] failed to load scripts:', scriptsRes.error.message);
  if (categoriesRes.error) console.error('[labs] failed to load categories:', categoriesRes.error.message);

  return (
    <LabsPageClient
      scripts={(scriptsRes.data ?? []) as LabScript[]}
      categories={(categoriesRes.data ?? []) as LabCategory[]}
    />
  );
}
