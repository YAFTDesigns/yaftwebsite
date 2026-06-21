'use client';

import styles from '@/app/services/services.module.css';
import { OPEN_LIGHTBOX_EVENT, type LightboxOpenDetail, type WorkshopGroup } from './Lightbox';

export default function WorkshopGallery({ group, cols = 5 }: { group: WorkshopGroup; cols?: 4 | 5 }) {
  return (
    <div className={`${styles.workshopGallery}${cols === 4 ? ` ${styles.cols4}` : ''}`}>
      {group.photos.map((photo, i) => (
        <button
          key={photo.caption}
          type="button"
          className={styles.workshopPhotoStand}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent<LightboxOpenDetail>(OPEN_LIGHTBOX_EVENT, { detail: { groupKey: group.key, index: i } })
            )
          }
        >
          {photo.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.src} alt={photo.caption} />
          ) : (
            <>
              <span className={styles.phIcon}>▢</span>
              <span className={styles.phLabel}>{photo.caption}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
