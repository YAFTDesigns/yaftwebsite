'use client';

import { useEffect, useState } from 'react';
import styles from './Lightbox.module.css';

export const OPEN_LIGHTBOX_EVENT = 'yaft:open-lightbox';

export type LightboxOpenDetail = { groupKey: string; index: number };
export type WorkshopPhoto = { caption: string; src?: string };
export type WorkshopGroup = { key: string; title: string; role: string; photos: WorkshopPhoto[] };

export default function Lightbox({ groups }: { groups: WorkshopGroup[] }) {
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<LightboxOpenDetail>).detail;
      setGroupKey(detail.groupKey);
      setIndex(detail.index);
    }
    window.addEventListener(OPEN_LIGHTBOX_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LIGHTBOX_EVENT, onOpen);
  }, []);

  const group = groups.find((g) => g.key === groupKey) ?? null;
  const open = !!group;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  function close() {
    setGroupKey(null);
  }
  function nav(delta: number) {
    if (!group) return;
    setIndex((i) => (i + delta + group.photos.length) % group.photos.length);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === 'ArrowRight') nav(1);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group]);

  const photo = group?.photos[index];

  return (
    <div className={`${styles.lightbox}${open ? ` ${styles.open}` : ''}`}>
      <div className={styles.backdrop} onClick={close} />
      <div className={styles.inner}>
        <button className={styles.close} aria-label="Close" onClick={close}>✕</button>
        <button className={`${styles.navBtn} ${styles.prev}`} aria-label="Previous" onClick={() => nav(-1)}>‹</button>
        <button className={`${styles.navBtn} ${styles.next}`} aria-label="Next" onClick={() => nav(1)}>›</button>
        <div className={styles.imgwrap}>
          {photo?.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.src} alt={photo.caption ?? ''} />
          )}
        </div>
        <div className={styles.side}>
          <div className="eyebrow">WORKSHOP</div>
          <h3>{group?.title}</h3>
          <div className={styles.role}>{photo?.caption}{group?.role ? `, ${group.role}` : ''}</div>
          <div className={styles.count}>{group ? `${index + 1} / ${group.photos.length}` : ''}</div>
        </div>
      </div>
    </div>
  );
}
