import { describe, it, expect } from 'vitest';
import { escapeHtml, safeDisplayName } from './email';

describe('escapeHtml', () => {
  it('escapes tags, quotes and ampersands', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
});

describe('safeDisplayName', () => {
  it('removes address and header injection characters', () => {
    const out = safeDisplayName('Bob <evil@x.com>, "y"\r\nBcc: a@b.com');
    expect(out).not.toMatch(/[<>",;@\r\n]/);
  });
  it('caps length', () => {
    expect(safeDisplayName('a'.repeat(300)).length).toBe(80);
  });
});
