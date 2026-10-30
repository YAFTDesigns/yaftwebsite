import { cleanText, safeHttpsLink } from './safe';

export const DESCRIPTION_MAX = 300; // same limit as the public Community Works form, so the card never silently truncates
export const TOOLS = ['rhino', 'grasshopper', 'rir'] as const;
export type Tool = (typeof TOOLS)[number];

/** The public card fields (same as the Community Works form). */
export function cardMeta(raw: unknown, courseSlug: string): { role: string; tool: Tool; category: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    role: cleanText(r.role, 80) || 'YAFT Designs student',
    tool: (TOOLS as readonly string[]).includes(r.tool as string) ? (r.tool as Tool) : toolForCourse(courseSlug),
    category: cleanText(r.category, 60),
  };
}
/** Default tool for a course, so the form is prefilled with the student's own course. */
export function toolForCourse(slug: string): Tool { return slug.includes('grasshopper') ? 'grasshopper' : slug.includes('revit') ? 'rir' : 'rhino'; }

export type RevisionInput = { title: string; description: string; links: string[] };

/** Validates what a student typed for a project revision. Pure, so it is unit tested. */
export function validateRevisionInput(raw: unknown): { ok: true; value: RevisionInput } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = cleanText(r.title, 120);
  if (!title) return { ok: false, error: 'Give your project a title.' };
  const description = cleanText(typeof r.description === 'string' ? r.description.replace(/\r\n/g, '\n') : '', DESCRIPTION_MAX);
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
