'use client';

import { useState, useEffect } from 'react';
import styles from '@/components/admin/adminPage.module.css';

type Photo = { filename: string; caption: string };
type Workshop = {
  id: string; key: string; num: string; place: string; title: string;
  role: string; description: string; photos: Photo[]; display_order: number; active: boolean;
};

const SITE_IMAGE_BASE = 'https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/site-images/workshops/';

export default function WorkshopsClient({ initialWorkshops }: { initialWorkshops?: Workshop[] }) {
  const hasInitialData = initialWorkshops !== undefined;
  const [workshops, setWorkshops] = useState<Workshop[]>(initialWorkshops ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadError, setLoadError] = useState('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/workshops');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load');
      setWorkshops(json.workshops ?? []);
    } catch {
      setLoadError('Could not load workshops.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasInitialData) return;
    load();
  }, []);

  async function uploadPhoto(key: string, file: File) {
    const caption = (captionDraft[key] ?? '').trim();
    if (!caption) {
      setUploadError(e => ({ ...e, [key]: 'Add a caption before uploading.' }));
      return;
    }
    setUploadingKey(key);
    setUploadError(e => ({ ...e, [key]: '' }));
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('caption', caption);
      const res = await fetch(`/api/admin/workshops/${key}/photos`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      setCaptionDraft(d => ({ ...d, [key]: '' }));
      await load();
    } catch (err: any) {
      setUploadError(e => ({ ...e, [key]: err?.message ?? 'Upload failed' }));
    } finally {
      setUploadingKey(null);
    }
  }

  async function removePhoto(key: string, filename: string) {
    if (!confirm('Remove this photo from the workshop entry?')) return;
    await fetch(`/api/admin/workshops/${key}/photos?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workshops</h1>
          <p className={styles.sub}>Manage the institutional workshop entries shown on /services.</p>
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : loadError ? (
        <p className={styles.empty}>{loadError}</p>
      ) : (
        <div className={styles.list}>
          {workshops.map(w => (
            <div className={styles.card} key={w.key}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.cardName}>{w.num} · {w.title}</p>
                  <p className={styles.cardRole}>{w.role}</p>
                  <p className={styles.cardCourse}>{w.place}{!w.active && ' · INACTIVE'}</p>
                </div>
              </div>
              {w.description && <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>{w.description}</p>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                {w.photos.map(p => (
                  <div key={p.filename} style={{ position: 'relative', width: 100 }}>
                    <img
                      src={`${SITE_IMAGE_BASE}${p.filename}`}
                      alt={p.caption}
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #2a2a2a', display: 'block' }}
                    />
                    <p style={{ fontSize: 10, color: '#777', marginTop: 4, lineHeight: 1.3 }}>{p.caption}</p>
                    <button
                      onClick={() => removePhoto(w.key, p.filename)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#E63946', borderRadius: 4, width: 20, height: 20, fontSize: 12, cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2a2a', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Caption for next upload"
                  value={captionDraft[w.key] ?? ''}
                  onChange={e => setCaptionDraft(d => ({ ...d, [w.key]: e.target.value }))}
                  style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#ddd', fontSize: 12, flex: '1 1 200px' }}
                />
                <label style={{ background: 'var(--brass)', color: '#0a0a0a', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: uploadingKey === w.key ? 0.6 : 1 }}>
                  {uploadingKey === w.key ? 'Uploading...' : 'Add photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    disabled={uploadingKey === w.key}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(w.key, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {uploadError[w.key] && <p style={{ fontSize: 12, color: '#E63946', marginTop: 8 }}>{uploadError[w.key]}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
