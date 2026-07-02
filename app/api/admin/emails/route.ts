import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET /api/admin/emails?type=logs
// GET /api/admin/emails?type=templates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const supabase = getSupabaseAdmin();

  if (type === 'logs') {
    const search = searchParams.get('search')?.trim() ?? '';
    let query = supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (search) {
      query = query.or(`to_email.ilike.%${search}%,to_name.ilike.%${search}%,subject.ilike.%${search}%,template.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[emails-api] GET logs failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  }

  if (type === 'templates') {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('key');
    if (error) {
      console.error('[emails-api] GET templates failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  }

  return NextResponse.json({ error: 'Invalid or missing type parameter (expected "logs" or "templates")' }, { status: 400 });
}

// PATCH /api/admin/emails  { id, subject, body_html }
// Updates an email template.
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id;
  const subject = body?.subject;
  const body_html = body?.body_html;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  if (typeof subject !== 'string' || typeof body_html !== 'string') {
    return NextResponse.json({ error: 'Missing subject or body_html' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('email_templates')
    .update({ subject, body_html, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[emails-api] PATCH template failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
