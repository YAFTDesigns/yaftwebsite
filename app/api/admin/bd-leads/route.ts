import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const FIELDS = [
  'organization','segment','country','city','website','department',
  'contact_name','contact_role','contact_channel','opportunity',
  'relevant_service','evidence','personalization_angle','priority',
  'status','last_contact_date','next_action','follow_up_date','notes',
];

// POST /api/admin/bd-leads -- create, or update if the organization
// (case-insensitive) already exists, per the spec's explicit
// "do not duplicate leads, update instead" rule.
//
// Uses a manual lookup-then-update-or-insert rather than
// .upsert(..., {onConflict:'organization'}): the table's uniqueness
// is a case-insensitive expression index (lower(organization)), not a
// constraint on the bare column, and Postgres's ON CONFLICT can't
// target that through the plain column name Supabase's upsert sends.
// Confirmed directly -- the upsert form was tested against the live
// table and failed with "no unique or exclusion constraint matching
// the ON CONFLICT specification" every time, which would have meant
// this route never once successfully updated an existing lead.
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const organization = body?.organization?.trim();
  if (!organization) return NextResponse.json({ error: 'organization is required' }, { status: 400 });

  const row: Record<string, unknown> = {};
  for (const f of FIELDS) if (body[f] !== undefined) row[f] = body[f] || null;
  row.organization = organization;
  row.updated_at = new Date().toISOString();

  // Escaped so a literal % or _ in an organization name (e.g. "100%
  // Design Studio") can't act as an ILIKE wildcard and match the
  // wrong row.
  const escaped = organization.replace(/[%_]/g, (c: string) => `\\${c}`);
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('bd_leads')
    .select('id')
    .ilike('organization', escaped)
    .maybeSingle();

  const query = existing
    ? supabase.from('bd_leads').update(row).eq('id', existing.id)
    : supabase.from('bd_leads').insert(row);

  const { data, error } = await query.select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
