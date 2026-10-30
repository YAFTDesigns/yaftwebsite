import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { generateCertificatePDF, COURSE_ACCENTS } from '@/lib/certificatePdf';

// Owner-only download of a live certificate. Anyone else (or a revoked one) gets the same 404.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ certificateId: string }> }) {
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { certificateId } = await params;
  const { data: c } = await getSupabaseAdmin().from('certificates').select('*').eq('certificate_id', certificateId).eq('student_id', s.profile.id).eq('revoked', false).maybeSingle();
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const key = (c.course_key in COURSE_ACCENTS ? c.course_key : 'default') as keyof typeof COURSE_ACCENTS;
  try {
    const pdf = await generateCertificatePDF({ studentName: c.student_name, courseKey: key, courseSuffix: c.course_suffix, durationHours: c.duration_hours, certificateId: c.certificate_id });
    return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="YAFT_Certificate_${c.certificate_id}.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (e) { console.error('[student-cert-pdf]', e); return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 }); }
}
