import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_MESSAGE = "Hi, I'm interested in your Rhino3D and Grasshopper courses.";

// GET /api/wa
// Redirects to wa.me without ever shipping the phone number in the
// client-side HTML/JS bundle, keeps it out of view-source and dev tools.
// The number itself lives only in Vercel's WHATSAPP_NUMBER env var,
// never committed to the repo.
export async function GET(request: NextRequest) {
  const number = process.env.WHATSAPP_NUMBER;
  if (!number) {
    return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 503 });
  }
  const text = request.nextUrl.searchParams.get('text') || DEFAULT_MESSAGE;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  return NextResponse.redirect(url);
}
