'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '@/app/services/services.module.css';

type ServiceItem = {
  key: string;
  num: string;
  title: string;
  description: string;
  tags: readonly string[];
  imageUrl: string | null;
  caption: string | null;
};

// The image column stays pinned (position: sticky) while the text
// column scrolls past it; IntersectionObserver tracks which service's
// text block currently has the most visible area and crossfades the
// sticky image to match. Deliberately not a scroll-hijacking library
// or manual scroll-position math -- sticky positioning is native,
// well-supported CSS, and IntersectionObserver is the same reliable
// primitive FadeInOnView already uses successfully elsewhere on this
// site. A service with no image just never becomes the active one for
// image purposes; its text still scrolls through normally.
export default function StickyServiceScroller({ services }: { services: ServiceItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const visibility = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          visibility.set(idx, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best = 0;
        let bestRatio = -1;
        for (const [idx, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = idx;
          }
        }
        if (bestRatio > 0) setActiveIndex(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [services.length]);

  const hasAnyImage = services.some((s) => s.imageUrl);

  return (
    <>
      {/* Desktop/tablet: sticky-pinned image, text scrolls past it.
          Hidden below 880px via CSS -- a pinned image beside a
          vertically scrolling column doesn't translate to a narrow
          viewport, so mobile gets its own simpler markup below
          instead of trying to force this layout smaller. */}
      <div className={styles.stickyScrollGrid}>
        {hasAnyImage && (
          <div className={styles.stickyImageCol}>
            <div className={styles.stickyImageFrame}>
              {services.map((svc, i) =>
                svc.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={svc.key}
                    src={svc.imageUrl}
                    alt={svc.title}
                    loading="lazy"
                    className={`${styles.stickyImage} ${i === activeIndex ? styles.stickyImageActive : ''}`}
                  />
                ) : null
              )}
              {services[activeIndex]?.caption && (
                <span className={styles.serviceImageCaption}>{services[activeIndex].caption}</span>
              )}
            </div>
          </div>
        )}
        <div className={hasAnyImage ? styles.scrollTextCol : styles.scrollTextColFull}>
          {services.map((svc, i) => (
            <div
              key={svc.key}
              ref={(el) => { refs.current[i] = el; }}
              data-idx={i}
              className={styles.scrollTextBlock}
            >
              <span className={styles.idx}>{svc.num}</span>
              <h3>{svc.title}</h3>
              <p>{svc.description}</p>
              <div className={styles.serviceTags}>
                {svc.tags.map((tag) => (
                  <span key={tag} className={styles.serviceTag}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: plain stacked image-then-content per service, no
          sticky/crossfade mechanics -- shown only below 880px. */}
      <div className={styles.mobileServicesList}>
        {services.map((svc) => (
          <div key={svc.key} className={styles.serviceBlock}>
            {svc.imageUrl ? (
              <div className={styles.serviceImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={svc.imageUrl} alt={svc.title} loading="lazy" />
                {svc.caption && <span className={styles.serviceImageCaption}>{svc.caption}</span>}
              </div>
            ) : null}
            <div className={`${styles.serviceContent} ${svc.imageUrl ? '' : styles.noImage}`}>
              <span className={styles.idx}>{svc.num}</span>
              <h3>{svc.title}</h3>
              <p>{svc.description}</p>
              <div className={styles.serviceTags}>
                {svc.tags.map((tag) => (
                  <span key={tag} className={styles.serviceTag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
