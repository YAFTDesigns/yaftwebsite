import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { COURSE_ACCENTS } from '@/lib/certificatePdf';
import { getErrorMessage } from '@/lib/errorMessage';

// GET /api/admin/certificates  -- list all (including revoked, for admin visibility)
export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('certificates').select('*').order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// Certificate ID format: YAFT{YYYYMM}-{sequence}, sequence resets
// per calendar month, matching the numbering already visible on
// certificates issued before this system existed (e.g. YAFT202605-21).
async function generateCertificateId(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `YAFT${yyyymm}-`;

  const { data, error } = await supabase
    .from('certificates')
    .select('certificate_id')
    .like('certificate_id', `${prefix}%`)
    .order('certificate_id', { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextSeq = 1;
  if (data && data.length > 0) {
    const lastSeq = parseInt(data[0].certificate_id.split('-')[1], 10);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${nextSeq}`;
}

// POST /api/admin/certificates
// { student_name, student_email?, course_key, course_suffix, duration_hours, issue_date?, notes? }
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.student_name || !body?.course_key || !body?.course_suffix || !body?.duration_hours) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!(body.course_key in COURSE_ACCENTS)) {
    return NextResponse.json({ error: `Unknown course_key. Valid: ${Object.keys(COURSE_ACCENTS).join(', ')}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const certificate_id = await generateCertificateId(supabase);
    const { data, error } = await supabase.from('certificates').insert({
      certificate_id,
      student_name: body.student_name,
      student_email: body.student_email || null,
      course_key: body.course_key,
      course_suffix: body.course_suffix,
      duration_hours: String(body.duration_hours),
      issue_date: body.issue_date || new Date().toISOString().slice(0, 10),
      notes: body.notes || null,
    }).select('*').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) || 'Failed to generate certificate ID' }, { status: 500 });
  }
}

// PATCH /api/admin/certificates  { id, revoked? , notes? }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { id, ...rest } = body;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('certificates').update(rest).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
