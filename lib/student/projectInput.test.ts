import { describe, it, expect } from 'vitest';
import { validateRevisionInput, editMode } from './projectInput';
import { sameOrigin } from './csrf';

describe('project input', () => {
  it('requires a title and cleans text', () => {
    expect(validateRevisionInput({ title: '   ' }).ok).toBe(false);
    const r = validateRevisionInput({ title: 'Pavilion\u0000 ', description: 'a\r\nb', links: ['https://example.com/x', ''] });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.title).toBe('Pavilion'); expect(r.value.links).toEqual(['https://example.com/x']); }
  });
  it('rejects unsafe links', () => {
    for (const bad of ['javascript:alert(1)', 'http://example.com', 'https://127.0.0.1/x', 'https://user:pw@example.com', 'data:text/html,hi'])
      expect(validateRevisionInput({ title: 't', links: [bad] }).ok).toBe(false);
  });
  it('caps links at 8 and removes duplicates', () => {
    const links = Array.from({ length: 12 }, (_, i) => `https://example.com/${i % 3}`);
    const r = validateRevisionInput({ title: 't', links });
    expect(r.ok && r.value.links.length).toBe(3);
  });
});

describe('edit mode', () => {
  it('never edits approved work in place and locks work under review', () => {
    expect(editMode(null)).toBe('new_revision');
    expect(editMode('approved')).toBe('new_revision');
    expect(editMode('draft')).toBe('edit_in_place');
    expect(editMode('changes_requested')).toBe('edit_in_place');
    expect(editMode('submitted')).toBe('locked');
    expect(editMode('under_review')).toBe('locked');
  });
});

describe('same-origin check', () => {
  const mk = (h: Record<string, string>) => new Request('https://www.yaftdesigns.com/api/student/profile', { method: 'POST', headers: h });
  it('accepts our own origin only', () => {
    expect(sameOrigin(mk({ origin: 'https://www.yaftdesigns.com', host: 'www.yaftdesigns.com' }))).toBe(true);
    expect(sameOrigin(mk({ origin: 'https://evil.example', host: 'www.yaftdesigns.com' }))).toBe(false);
    expect(sameOrigin(mk({ host: 'www.yaftdesigns.com' }))).toBe(false);
    expect(sameOrigin(mk({ origin: 'null', host: 'www.yaftdesigns.com' }))).toBe(false);
  });
});

import { resolvePhoto, photoKind } from './testimonials';
describe('testimonial photo rule', () => {
  const g = 'https://lh3.googleusercontent.com/a/x';
  it('prefers an upload, falls back to the Google picture, and honours "no photo"', () => {
    expect(resolvePhoto({ uploadedPath: 'u/p.webp', googleAvatar: g, noPhoto: false })).toBe('u/p.webp');
    expect(resolvePhoto({ uploadedPath: null, googleAvatar: g, noPhoto: false })).toBe(`google:${g}`);
    expect(resolvePhoto({ uploadedPath: 'u/p.webp', googleAvatar: g, noPhoto: true })).toBeNull();
    expect(resolvePhoto({ uploadedPath: null, googleAvatar: null, noPhoto: false })).toBeNull();
    expect(photoKind(`google:${g}`)).toBe('google');
    expect(photoKind('u/p.webp')).toBe('upload');
    expect(photoKind(null)).toBe('none');
  });
});

import { cardMeta, toolForCourse, DESCRIPTION_MAX } from './projectInput';
describe('project card fields (mirror the public form)', () => {
  it('prefills the tool from the course and keeps the same 300 character limit', () => {
    expect(toolForCourse('grasshopper-architecture')).toBe('grasshopper');
    expect(toolForCourse('revit-rhino-inside')).toBe('rir');
    expect(toolForCourse('rhino-architecture')).toBe('rhino');
    expect(DESCRIPTION_MAX).toBe(300);
    const r = validateRevisionInput({ title: 't', description: 'x'.repeat(500) });
    expect(r.ok && r.value.description.length).toBe(300);
  });
  it('cleans role and category and ignores an unknown tool', () => {
    const m = cardMeta({ role: '  M.Arch\u0000 VIT ', tool: 'evil', category: 'Facade' }, 'grasshopper-architecture');
    expect(m).toEqual({ role: 'M.Arch VIT', tool: 'grasshopper', category: 'Facade' });
    expect(cardMeta({}, 'rhino-architecture').role).toBe('YAFT Designs student');
  });
});

import { linkedinProfileUrl, hasLinkedinIdentity } from './verified';
describe('LinkedIn verification helpers', () => {
  it('accepts real profile addresses only', () => {
    expect(linkedinProfileUrl('linkedin.com/in/arjun-r')).toBe('https://www.linkedin.com/in/arjun-r');
    expect(linkedinProfileUrl('https://in.linkedin.com/in/arjun-r/')).toBe('https://www.linkedin.com/in/arjun-r');
    for (const bad of ['https://evil.com/in/arjun', 'https://linkedin.com.evil.com/in/arjun', 'https://www.linkedin.com/company/x', 'javascript:alert(1)', 'https://u:p@linkedin.com/in/arjun', 'http://x', '', 42])
      expect(linkedinProfileUrl(bad as unknown)).toBeNull();
  });
  it('is verified only by a LinkedIn sign-in identity, never by a typed link', () => {
    expect(hasLinkedinIdentity([{ provider: 'google' }, { provider: 'linkedin_oidc' }])).toBe(true);
    expect(hasLinkedinIdentity([{ provider: 'google' }])).toBe(false);
    expect(hasLinkedinIdentity(null)).toBe(false);
  });
});
