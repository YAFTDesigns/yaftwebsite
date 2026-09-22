'use client';

import { useState } from 'react';
import { resolveServiceImageUrl } from '@/lib/serviceImages';

type Row = { key: string; label: string; image_path: string | null; caption: string };

export default function ServicesImagesClient({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});

  async function upload(key: string, file: File) {
    setUploadingKey(key);
    setError((e) => ({ ...e, [key]: '' }));
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('caption', (captionDraft[key] ?? '').trim());
      const res = await fetch(`/api/admin/services/${key}/image`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, image_path: json.serviceImage.image_path, caption: json.serviceImage.caption ?? '' } : r)));
    } catch (err) {
      setError((e) => ({ ...e, [key]: err instanceof Error ? err.message : 'Upload failed' }));
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {rows.map((row) => {
        const url = resolveServiceImageUrl(row.image_path);
        return (
          <div key={row.key} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 20, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ width: 160, height: 110, background: '#161616', borderRadius: 6, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={row.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#555' }}>No image</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#fff', marginBottom: 4 }}>{row.label}</p>
              {row.caption && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 10 }}>{row.caption}</p>}
              <input
                type="text"
                placeholder="Caption for next upload"
                value={captionDraft[row.key] ?? ''}
                onChange={(e) => setCaptionDraft((d) => ({ ...d, [row.key]: e.target.value }))}
                style={{ display: 'block', width: '100%', marginBottom: 10, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#fff', fontSize: 12, fontFamily: 'var(--mono)' }}
              />
              <label style={{ display: 'inline-block', background: 'var(--brass)', color: '#0a0a0a', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: uploadingKey === row.key ? 0.6 : 1 }}>
                {uploadingKey === row.key ? 'Uploading...' : row.image_path ? 'Replace image' : 'Add image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingKey === row.key}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(row.key, file); e.target.value = ''; }}
                  style={{ display: 'none' }}
                />
              </label>
              {error[row.key] && <p style={{ fontSize: 12, color: '#E63946', marginTop: 8 }}>{error[row.key]}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
