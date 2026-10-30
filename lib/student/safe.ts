// Input hygiene for everything students type or upload. Pure, so it is unit tested.

/** Strip control characters and collapse whitespace; cap the length. Output is plain text and is always rendered as text. */
export function cleanText(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max);
}

/** Names: letters, marks, spaces and common punctuation only. */
export function cleanName(input: unknown, max = 80): string {
  return cleanText(input, max).replace(/[^\p{L}\p{M}\p{N} .,'’()-]/gu, '').trim();
}

/** Only https links to public hosts. Blocks javascript:, data:, http, credentials in the URL, IPs and localhost. */
export function safeHttpsLink(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 500) return null;
  let u: URL;
  try { u = new URL(input.trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || h.startsWith('[')) return null;
  return u.toString();
}

/** A storage-safe file name: no path parts, no odd characters, bounded length. */
export function safeFileName(name: unknown): string {
  const base = String(name ?? 'file').split(/[\\/]/).pop() ?? 'file';
  const cleaned = base.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').replace(/_+/g, '_').slice(0, 80);
  return cleaned || 'file';
}

/** Spreadsheet formula injection: prefix cells that start with = + - @ tab or CR so Excel treats them as text. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Private supporting files: documents and archives only; never HTML/SVG/scripts. Checked against REAL content (magic bytes).
const SIGS: { ext: string; mime: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: 'pdf', mime: 'application/pdf', test: (b) => b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { ext: 'zip', mime: 'application/zip', test: (b) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05) },
  { ext: '3dm', mime: 'application/octet-stream', test: (b) => b.length > 8 && String.fromCharCode(...b.slice(0, 8)) === '3D Geome' },
];
export const MAX_PRIVATE_FILE_BYTES = 25 * 1024 * 1024;

export function sniffPrivateFile(bytes: Uint8Array): { ext: string; mime: string } | null {
  for (const s of SIGS) if (s.test(bytes)) return { ext: s.ext, mime: s.mime };
  return null;
}
