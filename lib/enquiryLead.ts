import type { SupabaseClient } from '@supabase/supabase-js';

export type EnquiryContext = {
  audience: string | null;
  funnel: string | null;
  need: string | null;
  organisation: string | null;
  interest: string | null;
};

// Copies the newest enquiry's audience/funnel/need onto the lead (so the admin can
// filter without joins) and writes a history line. Best-effort: never throws,
// because the enquiry itself is already saved and must not fail over this.
export async function recordEnquiryContext(supabase: SupabaseClient, leadId: string, ctx: EnquiryContext): Promise<void> {
  try {
    const patch: Record<string, string> = {};
    if (ctx.audience) patch.audience = ctx.audience;
    if (ctx.funnel) patch.funnel = ctx.funnel;
    if (ctx.need) patch.need = ctx.need;
    if (ctx.organisation) patch.organisation = ctx.organisation;
    if (ctx.interest) patch.service_interest = ctx.interest.slice(0, 120);
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('leads').update(patch).eq('id', leadId);
      if (error) throw error;
    }
    const bits = [ctx.funnel && `${ctx.funnel} funnel`, ctx.audience, ctx.organisation, ctx.need].filter(Boolean);
    await supabase.from('lead_notes').insert({
      lead_id: leadId,
      kind: 'system',
      body: `Enquiry received${bits.length ? `: ${bits.join(', ')}` : ''}${ctx.interest ? `. Interested in ${ctx.interest}` : ''}`.slice(0, 2000),
    });
  } catch (err) {
    console.error('[enquiry] could not record lead context:', err);
  }
}
