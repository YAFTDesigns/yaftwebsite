import type { SupabaseClient } from '@supabase/supabase-js';

export type LeadSource = 'syllabus_gate' | 'contact_form';

export async function upsertLead(
  supabase: SupabaseClient,
  params: { email?: string | null; linkedinUrl?: string | null; name?: string | null; source: LeadSource }
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
  return data.id as string;
}
