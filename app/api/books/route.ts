import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('books')
    .select('title, author, description, tag, url, cover_url')
    .eq('active', true)
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
