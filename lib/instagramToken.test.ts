import { describe, it, expect } from 'vitest';
import { cleanToken } from './instagramToken';

describe('cleanToken', () => {
  it('strips quotes, spaces and line breaks', () => {
    expect(cleanToken('  "IGAAabc123"\n')).toBe('IGAAabc123');
    expect(cleanToken("'IGAA abc\n123'")).toBe('IGAAabc123');
  });
  it('returns undefined for blank', () => {
    expect(cleanToken('  ')).toBeUndefined();
    expect(cleanToken(undefined)).toBeUndefined();
  });
});
