import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeInactive = request.nextUrl.searchParams.get('all') === '1';
  const supabase = getSupabaseAdmin();
  let query = supabase.from('clients').select('*').is('deleted_at', null).order('name', { ascending: true });
  if (!includeInactive) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
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
  if (!name) return NextResponse.json({ error: 'Client name is required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: clientRow, error } = await supabase.from('clients').insert({
    name,
    company_name: data.company_name || null,
    gstin: data.gstin || null,
    address: data.address || null,
    phone: data.phone || null,
    email: data.email || null,
    notes: data.notes || null,
    active: true,
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: clientRow });
}
