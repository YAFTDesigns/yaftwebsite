import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from('mentors')
    .select('name, role, bio, photo_key, linkedin_url')
    .eq('type', 'guest')
    .eq('active', true)
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
