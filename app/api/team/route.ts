import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const trash = request.nextUrl.searchParams.get('trash') === 'true';
  const includeInactive = request.nextUrl.searchParams.get('all') === '1';
  const supabase = getSupabaseAdmin();

  if (trash) {
    const { data, error } = await supabase.from('team_members').select('*').not('deleted_at', 'is', null).order('name', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ team: data ?? [] });
  }

  let query = supabase.from('team_members').select('*').is('deleted_at', null).order('name', { ascending: true });
  if (!includeInactive) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ team: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60000 });
  if (limited) return limited;
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const name = String(data.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: member, error } = await supabase.from('team_members').insert({
    name,
    role: data.role || null,
    email: data.email || null,
    phone: data.phone || null,
    salary: data.salary === '' || data.salary == null ? null : Number(data.salary),
    notes: data.notes || null,
    active: true,
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member });
}
