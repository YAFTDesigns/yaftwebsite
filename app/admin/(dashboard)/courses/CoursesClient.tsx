'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSiteImageUrl } from '@/lib/supabase/storage';

export type CourseRow = {
  slug: string; title: string; tool: string; level: string; duration: string;
  description: string; image_path: string | null; active: boolean; href: string;
};

const input: React.CSSProperties = {
  width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6,
  padding: '7px 10px', color: '#fff', fontSize: 13, fontFamily: 'var(--mono)',
};
const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 };

export default function CoursesClient({ initialRows }: { initialRows: CourseRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  const patchLocal = (slug: string, p: Partial<CourseRow>) =>
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...p } : r)));
  const note = (slug: string, ok: boolean, text: string) => setMsg((m) => ({ ...m, [slug]: { ok, text } }));

  async function save(row: CourseRow) {
    setBusy(row.slug); note(row.slug, true, '');
    try {
      const res = await fetch(`/api/admin/courses/${row.slug}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: row.title, tool: row.tool, level: row.level, duration: row.duration, description: row.description, active: row.active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      note(row.slug, true, 'Saved');
    } catch (e) { note(row.slug, false, e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(null); }
  }

  async function upload(slug: string, file: File) {
    setBusy(slug); note(slug, true, '');
    try {
      const form = new FormData(); form.append('file', file);
      const res = await fetch(`/api/admin/courses/${slug}/image`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      patchLocal(slug, { image_path: json.course.image_path });
      note(slug, true, 'Image updated');
    } catch (e) { note(slug, false, e instanceof Error ? e.message : 'Upload failed'); }
    finally { setBusy(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {rows.map((r) => (
        <div key={r.slug} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 20, opacity: r.active ? 1 : 0.7 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 150, flexShrink: 0 }}>
              <div style={{ height: 105, background: '#161616', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getSiteImageUrl(r.image_path)} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#555' }}>No image</span>}
              </div>
              <label style={{ display: 'block', marginTop: 8, textAlign: 'center', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 0', fontSize: 12, color: 'var(--ink-soft)', cursor: 'pointer' }}>
                Replace image
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy === r.slug} style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(r.slug, f); e.target.value = ''; }} />
              </label>
            </div>

            <div style={{ flex: 1, minWidth: 260, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={label}>Title</span>
                <input style={input} value={r.title} onChange={(e) => patchLocal(r.slug, { title: e.target.value })} />
              </div>
              <div><span style={label}>Tool</span><input style={input} value={r.tool} onChange={(e) => patchLocal(r.slug, { tool: e.target.value })} /></div>
              <div><span style={label}>Level</span><input style={input} value={r.level} onChange={(e) => patchLocal(r.slug, { level: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={label}>Duration</span><input style={input} value={r.duration} onChange={(e) => patchLocal(r.slug, { duration: e.target.value })} /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={label}>Short description (shown on the card)</span>
                <textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={r.description} onChange={(e) => patchLocal(r.slug, { description: e.target.value })} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 12, color: '#ccc', cursor: 'pointer' }}>
              <input type="checkbox" checked={r.active} onChange={(e) => patchLocal(r.slug, { active: e.target.checked })} />
              Published on /courses
            </label>
            <button onClick={() => save(r)} disabled={busy === r.slug || !r.title.trim()}
              style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: busy === r.slug ? 0.6 : 1 }}>
              {busy === r.slug ? 'Working...' : 'Save changes'}
            </button>
            <Link href={r.href} target="_blank" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--blueprint)', textDecoration: 'none' }}>View on website ↗</Link>
            {msg[r.slug]?.text && <span style={{ fontSize: 12, color: msg[r.slug].ok ? '#4caf50' : '#E63946' }}>{msg[r.slug].text}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
