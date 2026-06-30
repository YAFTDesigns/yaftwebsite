export const COMMUNITY_ALLOWED_TABLES = ['student_work', 'publications', 'partners'] as const;
export type CommunityTable = (typeof COMMUNITY_ALLOWED_TABLES)[number];

/**
 * The only thing preventing /api/admin/community from being a generic
 * "read/write/delete any table" endpoint is this allowlist check —
 * the route uses the service-role key, which bypasses RLS entirely,
 * so this is a real security boundary, not a cosmetic one.
 */
export function isCommunityTable(table: unknown): table is CommunityTable {
  return typeof table === 'string' && (COMMUNITY_ALLOWED_TABLES as readonly string[]).includes(table);
}
