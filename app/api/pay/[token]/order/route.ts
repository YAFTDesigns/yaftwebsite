import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitShared } from '@/lib/rateLimitShared';
import { createCourseOrder } from '@/lib/courseOrder';

// POST /api/pay/<token>/order { choice?, details? } -> Razorpay order for whichever payment is due next on this plan.
export async function POST(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const limited = await rateLimitShared(request, 'pay-order', { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return NextResponse.json({ error: 'Invalid link.' }, { status: 404 });
  const { data: plan } = await getSupabaseAdmin().from('course_payment_plans').select('*').eq('token', token).maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Invalid link.' }, { status: 404 });
  const body = await request.json().catch(() => null);
  const r = await createCourseOrder(plan, body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ orderId: r.orderId, amount: r.amount, currency: r.currency, keyId: r.keyId, kind: r.kind, name: r.name, email: r.email });
}
