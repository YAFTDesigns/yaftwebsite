import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Course fees shown on the public course pages. They come from the same `courses.fee_inr`
 * (and `course_bundles.fee_inr`) values the checkout charges, so a page can never quote
 * a different price from the one the buyer pays. All fees are base amounts before 18% GST.
 * The fallback only applies if the database cannot be read (it mirrors the live fees).
 */
export const FALLBACK_FEES: Record<string, number> = {
  'rhino-architecture': 25000,
  'grasshopper-architecture': 30000,
  'rhino-industrial-design': 30000,
  'rhino-aec-climate': 10000,
  'revit-rhino-inside': 60000,
  'rhino-wearables-footwear': 30000,
};
export const FALLBACK_COMBO = 40000;
export const COMBO_SLUG = 'rhino-grasshopper-architecture';

export type CoursePricing = { fee: number; combo: number };

/** Rough USD figure shown as "approx.". Same rate the pages always used (Rs 25,000 = $300). */
export const usdApprox = (inr: number) => Math.round(inr / (25000 / 300));
export const fmtInr = (n: number) => n.toLocaleString('en-IN');

export async function getCoursePricing(slug: string): Promise<CoursePricing> {
  const fallback: CoursePricing = { fee: FALLBACK_FEES[slug], combo: FALLBACK_COMBO };
  try {
    const supabase = getSupabaseAdmin();
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from('courses').select('fee_inr').eq('slug', slug).maybeSingle(),
      supabase.from('course_bundles').select('fee_inr').eq('slug', COMBO_SLUG).maybeSingle(),
    ]);
    return {
      fee: c?.fee_inr != null ? Number(c.fee_inr) : fallback.fee,
      combo: b?.fee_inr != null ? Number(b.fee_inr) : fallback.combo,
    };
  } catch {
    return fallback;
  }
}

/** The payment line every online course page shows. Online checkout first; NEFT only on request. */
export const PAYMENT_NOTE =
  'Pay online by UPI, card or netbanking (Razorpay) when you enrol. Pay 50% now and the balance later, or the full fee at once. Each payment gets its own GST invoice by email. Prefer a bank transfer (NEFT)? Contact us and we will share the details.';
