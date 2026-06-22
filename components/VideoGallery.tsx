'use client';

import { useState } from 'react';
import styles from '@/app/resources/resources.module.css';

export type VideoItem = { id: string; title: string; meta: string };

export default function VideoGallery({ videos }: { videos: VideoItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = videos.find((v) => v.id === openId) ?? null;

  return (
    <>
      <div className={styles.videoGrid}>
        {videos.map((v) => (
          <button key={v.id} type="button" className={styles.videoCard} onClick={() => setOpenId(v.id)}>
            <div className={styles.videoThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`} alt={v.title} />
              <div className={styles.videoPlay}>
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
            <div className={styles.videoCardBody}>
              <h4>{v.title}</h4>
              <span className={styles.videoMeta}>{v.meta}</span>
            </div>
          </button>
        ))}
      </div>

      <div className={`${styles.lightbox}${open ? ` ${styles.open}` : ''}`}>
        <div className={styles.lightboxBackdrop} onClick={() => setOpenId(null)} />
        <div className={styles.lightboxInner}>
          <button className={styles.lightboxClose} aria-label="Close" onClick={() => setOpenId(null)}>✕</button>
          <div className={styles.lightboxVideoFrame}>
            {open && (
              <iframe
                src={`https://www.youtube.com/embed/${open.id}?autoplay=1`}
                title={open.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
          <div className={styles.lightboxVideoInfo}>
            <h3>{open?.title}</h3>
          </div>
        </div>
      </div>
    </>
  );
}
