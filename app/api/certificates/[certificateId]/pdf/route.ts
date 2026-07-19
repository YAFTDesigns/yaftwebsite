import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { generateCertificatePDF, COURSE_ACCENTS } from '@/lib/certificatePdf';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/certificates/[certificateId]/pdf
// Public, same reasoning as /api/certificates/verify -- generates the
// PDF fresh from stored fields every time, nothing is ever read from
// or written to file storage.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60000 });
  if (limited) return limited;

  const { certificateId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('certificate_id', certificateId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.revoked) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  const courseKey = (data.course_key in COURSE_ACCENTS ? data.course_key : 'default') as keyof typeof COURSE_ACCENTS;

  try {
    const pdfBuffer = await generateCertificatePDF({
      studentName: data.student_name,
      courseKey,
      courseSuffix: data.course_suffix,
      durationHours: data.duration_hours,
      certificateId: data.certificate_id,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="YAFT_Certificate_${data.certificate_id}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[certificate-pdf] generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 });
  }
}
