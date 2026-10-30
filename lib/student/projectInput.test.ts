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
