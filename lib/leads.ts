import type { SupabaseClient } from '@supabase/supabase-js';

export type LeadSource = 'syllabus_gate' | 'contact_form';

export async function upsertLead(
  supabase: SupabaseClient,
  params: { email?: string | null; linkedinUrl?: string | null; name?: string | null; source: LeadSource; sessionId?: string | null }
): Promise<string> {
  const email = params.email?.trim().toLowerCase() || null;
  const linkedinUrl = params.linkedinUrl?.trim() || null;
  if (!email && !linkedinUrl) throw new Error('upsertLead requires an email or a LinkedIn URL');

  const { data, error } = await supabase
    .from('leads')
    .upsert(
      {
        email,
        linkedin_url: linkedinUrl,
        name: params.name ?? null,
        source: params.source,
        last_seen: new Date().toISOString(),
      },
      { onConflict: email ? 'email' : 'linkedin_url' }
    )
    .select('id')
    .single();

  if (error) throw error;
  const leadId = data.id as string;

  // If we know which browsing session this person came from, link it
  // so we can compute time-on-site from their page_view events, and
  // tag any events already logged in this session as theirs.
  const sessionId = params.sessionId?.trim() || null;
  if (sessionId) {
    await supabase.from('lead_sessions').upsert({ session_id: sessionId, lead_id: leadId }, { onConflict: 'session_id' });
    await supabase.from('analytics_events').update({ lead_id: leadId }).eq('session_id', sessionId).is('lead_id', null);
  }

  return leadId;
}
