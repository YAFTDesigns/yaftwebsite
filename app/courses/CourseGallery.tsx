'use client';

import { OPEN_LIGHTBOX_EVENT, type LightboxOpenDetail } from '@/components/Lightbox';
import s from './course.module.css';

export type GalleryImage = { src: string; caption: string };

export default function CourseGallery({ groupKey, images }: { groupKey: string; images: GalleryImage[] }) {
  if (images.length === 0) return null;

  return (
    <div className={s.galleryGrid}>
      {images.map((img, i) => (
        <button
          key={img.src}
          type="button"
          className={s.galleryThumb}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent<LightboxOpenDetail>(OPEN_LIGHTBOX_EVENT, { detail: { groupKey, index: i } })
            )
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.src} alt={img.caption} />
        </button>
      ))}
    </div>
  );
}
