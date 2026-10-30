import { cleanText, safeHttpsLink } from './safe';

export type RevisionInput = { title: string; description: string; links: string[] };

/** Validates what a student typed for a project revision. Pure, so it is unit tested. */
export function validateRevisionInput(raw: unknown): { ok: true; value: RevisionInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = cleanText(r.title, 120);
  if (!title) return { ok: false, error: 'Give your project a title.' };
  const description = cleanText(typeof r.description === 'string' ? r.description.replace(/\r\n/g, '\n') : '', 4000);
  const rawLinks = Array.isArray(r.links) ? r.links.slice(0, 8) : [];
  const links: string[] = [];
  for (const l of rawLinks) {
    if (typeof l === 'string' && !l.trim()) continue;
    const ok = safeHttpsLink(l);
    if (!ok) return { ok: false, error: 'Links must be public https:// addresses.' };
    if (!links.includes(ok)) links.push(ok);
  }
  return { ok: true, value: { title, description, links } };
}

export type RevisionStatus = 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved';

/** What a student may do with the latest revision. Submitted and under-review work is locked while it is being reviewed. */
export function editMode(latest: RevisionStatus | null): 'new_revision' | 'edit_in_place' | 'locked' {
  if (latest === null || latest === 'approved') return 'new_revision';
  if (latest === 'draft' || latest === 'changes_requested') return 'edit_in_place';
  return 'locked';
}
