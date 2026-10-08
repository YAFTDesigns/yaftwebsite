import sharp from 'sharp';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_PIXELS = 40_000_000; // refuse decompression-bomb style images

export type CleanImage = { buffer: Buffer; contentType: 'image/webp'; ext: 'webp' };

/**
 * Decode an untrusted upload, check the REAL format (not the file name or
 * declared MIME), strip metadata, cap the size and re-encode to WebP.
 * Returns null when the file is not an acceptable image.
 */
export async function cleanImageUpload(file: File, maxEdge = 1600): Promise<CleanImage | null> {
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const img = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' });
    const meta = await img.metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) return null;
    const buffer = await img
      .rotate() // honour EXIF orientation, then metadata is dropped on output
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer, contentType: 'image/webp', ext: 'webp' };
  } catch {
    return null;
  }
}
