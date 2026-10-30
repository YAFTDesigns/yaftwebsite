import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { logCourseEvent } from '@/lib/coursePaymentFulfil';
import { adminEmail } from '@/lib/admin/adminEmail';

// Covered by the proxy matcher (/api/admin/:path*); admin check repeated as defence in depth.
// Fee changes only affect NEW checkouts: a plan that already exists keeps the fee it was created with.

const fee = (v: unknown): number | null | undefined => {
  if (v === null || v === '') return null;
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 10_000_000 ? n : undefined;
};
const slugOk = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{1,60}$/.test(s);

export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [{ data: courses }, { data: bundles }, { data: fx }] = await Promise.all([
    supabase.from('courses').select('slug, title, fee_inr, checkout_enabled, active').order('title'),
    supabase.from('course_bundles').select('*').order('sort'),
    supabase.from('fx_rates').select('inr_per_usd, source, fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return NextResponse.json({ courses: courses ?? [], bundles: bundles ?? [], fx, checkoutOn: process.env.COURSE_CHECKOUT_ENABLED === '1' });
}

// PATCH { kind:'course', slug, fee_inr (rupees before GST, or null), checkout_enabled }
// PATCH { kind:'bundle', id, fee_inr?, active?, title?, description?, sort? }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const supabase = getSupabaseAdmin();
  const by = await adminEmail();
  if (b?.kind === 'course' && slugOk(b.slug)) {
    const f = fee(b.fee_inr);
    if (f === undefined) return NextResponse.json({ error: 'Fee must be a whole number of rupees (before GST), or empty.' }, { status: 400 });
    const enabled = f !== null && b.checkout_enabled === true; // cannot sell without a fee
    const { error } = await supabase.from('courses').update({ fee_inr: f, checkout_enabled: enabled }).eq('slug', b.slug);
    if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    await logCourseEvent({ event: 'course_fee_changed', detail: { by, slug: b.slug, fee_inr: f, enabled } });
    return NextResponse.json({ ok: true });
  }
  if (b?.kind === 'bundle' && typeof b.id === 'string') {
    const patch: Record<string, unknown> = {};
    if (b.fee_inr !== undefined) { const f = fee(b.fee_inr); if (!f) return NextResponse.json({ error: 'A combo needs a fee in whole rupees.' }, { status: 400 }); patch.fee_inr = f; }
    if (typeof b.active === 'boolean') patch.active = b.active;
    if (typeof b.title === 'string' && b.title.trim()) patch.title = b.title.trim().slice(0, 120);
    if (typeof b.description === 'string') patch.description = b.description.trim().slice(0, 300);
    if (Number.isInteger(b.sort)) patch.sort = b.sort;
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
    const { error } = await supabase.from('course_bundles').update(patch).eq('id', b.id);
    if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    await logCourseEvent({ event: 'bundle_changed', detail: { by, id: b.id, ...patch } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// POST { slug, title, description, course_slugs: [2+], fee_inr }  creates a combo. To retire one, set active=false.
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const f = fee(b?.fee_inr);
  const slugs = Array.isArray(b?.course_slugs) ? [...new Set((b.course_slugs as unknown[]).filter(slugOk))] : [];
  if (!slugOk(b?.slug) || typeof b?.title !== 'string' || !b.title.trim() || !f || slugs.length < 2) {
    return NextResponse.json({ error: 'A combo needs a slug, a title, at least two courses and a fee.' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data: known } = await supabase.from('courses').select('slug').in('slug', slugs);
  if ((known ?? []).length !== slugs.length) return NextResponse.json({ error: 'One of the courses does not exist.' }, { status: 400 });
  const { error } = await supabase.from('course_bundles').insert({ slug: b.slug, title: b.title.trim().slice(0, 120), description: String(b.description ?? '').trim().slice(0, 300), course_slugs: slugs, fee_inr: f });
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That slug is already used.' : 'Could not create the combo.' }, { status: error.code === '23505' ? 409 : 500 });
  await logCourseEvent({ event: 'bundle_created', detail: { by: await adminEmail(), slug: b.slug, fee_inr: f, course_slugs: slugs } });
  return NextResponse.json({ ok: true });
}
