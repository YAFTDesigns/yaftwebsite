import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { cleanImageUpload } from './imageUpload';

describe('cleanImageUpload', () => {
  it('re-encodes a real PNG to webp and caps size', async () => {
    const png = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#e63946' } }).png().toBuffer();
    const out = await cleanImageUpload(new File([new Uint8Array(png)], 'x.png', { type: 'image/png' }));
    expect(out?.ext).toBe('webp');
    const meta = await sharp(out!.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1600);
  });
  it('rejects a non-image renamed to .jpg', async () => {
    const out = await cleanImageUpload(new File(['<svg onload=alert(1)></svg>'], 'evil.jpg', { type: 'image/jpeg' }));
    expect(out).toBeNull();
  });
  it('rejects svg', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';
    expect(await cleanImageUpload(new File([svg], 'a.svg', { type: 'image/svg+xml' }))).toBeNull();
  });
});
