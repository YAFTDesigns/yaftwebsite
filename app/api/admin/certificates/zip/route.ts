import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { generateCertificatePDF, COURSE_ACCENTS } from '@/lib/certificatePdf';

// GET /api/admin/certificates/zip?batch=YAFT-112026-23  -- every live certificate in a corporate batch, as one zip of PDFs.
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const batch = (request.nextUrl.searchParams.get('batch') || '').trim().toUpperCase();
  if (!batch) return NextResponse.json({ error: 'Missing batch' }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from('certificates').select('*').eq('batch_ref', batch).eq('revoked', false).order('certificate_id').limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: 'No certificates in that batch' }, { status: 404 });
  const zip = new JSZip();
  for (const c of data) {
    const key = (c.course_key in COURSE_ACCENTS ? c.course_key : 'default') as keyof typeof COURSE_ACCENTS;
    const pdf = await generateCertificatePDF({ studentName: c.student_name, courseKey: key, courseSuffix: c.course_suffix, durationHours: c.duration_hours, certificateId: c.certificate_id, company: c.company ?? null });
    zip.file(`${c.certificate_id} ${c.student_name.replace(/[^\w .-]/g, '')}.pdf`, pdf);
  }
  const buf = await zip.generateAsync({ type: 'uint8array' });
  return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="YAFT_Certificates_${batch}.zip"`, 'Cache-Control': 'private, no-store' } });
}
