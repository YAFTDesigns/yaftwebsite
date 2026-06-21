import type { SupabaseClient } from '@supabase/supabase-js';

export type LeadSource = 'syllabus_gate' | 'contact_form';

export async function upsertLead(
  supabase: SupabaseClient,
  params: { email: string; linkedinUrl?: string | null; name?: string | null; source: LeadSource }
): Promise<string> {
  const email = params.email.trim().toLowerCase();

  const { data, error } = await supabase
    .from('leads')
    .upsert(
      {
        email,
        linkedin_url: params.linkedinUrl ?? null,
        name: params.name ?? null,
        source: params.source,
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
