import { getSupabaseAdmin } from '@/lib/supabase/admin';
import LabsPageClient from './LabsPageClient';

export const metadata = {
  title: 'YAFT Labs — Free Grasshopper & Rhino Scripts | YAFT Designs',
  description: 'Small Grasshopper and Rhino scripts from YAFT Designs reels and projects. Free to download.',
};

export const dynamic = 'force-dynamic';

export type LabScript = {
  id: string; title: string; description: string; tool: string;
  price: number; file_path: string | null; thumbnail_path: string | null;
  download_count: number;
};

export default async function LabsPage() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('lab_scripts')
    .select('id, title, description, tool, price, file_path, thumbnail_path, download_count')
    .eq('active', true)
    .not('file_path', 'is', null)
    .order('display_order');

  if (error) console.error('[labs] failed to load scripts:', error.message);

  return <LabsPageClient scripts={(data ?? []) as LabScript[]} />;
}
