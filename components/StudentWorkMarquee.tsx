'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './StudentWorkMarquee.module.css';
import { imageUrl } from '@/lib/assetUrl';

const ROW1: { src: string; label: string }[] = [
  { src: imageUrl('student-work/sw-01.jpg'), label: 'Parametric Shell Structure' },
  { src: imageUrl('student-work/sw-02.jpg'), label: 'Contour Bench' },
  { src: imageUrl('student-work/sw-03.jpg'), label: 'Voronoi Facade Panel' },
  { src: imageUrl('student-work/sw-04.jpg'), label: 'Curtain Wall, Revit' },
  { src: imageUrl('student-work/sw-05.jpg'), label: 'Absolute Towers Recreation' },
  { src: imageUrl('student-work/sw-06.jpg'), label: 'Acoustic Panel, 3D Printed' },
  { src: imageUrl('student-work/sw-07.jpg'), label: 'Bambu Lab in Progress' },
  { src: imageUrl('student-work/sw-15.jpg'), label: 'Parametric Wall Panel' },
  { src: imageUrl('student-work/sw-16.jpg'), label: 'Contour Chair Render' },
  { src: imageUrl('student-work/sw-17.jpg'), label: 'Organic Facade Panel' },
];

const ROW2: { src: string; label: string }[] = [
  { src: imageUrl('student-work/sw-08.jpg'), label: 'Flexible Lattice Textile' },
  { src: imageUrl('student-work/sw-09.jpg'), label: 'Parametric Shoe' },
  { src: imageUrl('student-work/sw-10.jpg'), label: 'Voronoi Vessel' },
  { src: imageUrl('student-work/sw-11.jpg'), label: 'Parametric Collar, Unreal' },
  { src: imageUrl('student-work/sw-12.jpg'), label: 'Lattice Shoe Structure' },
  { src: imageUrl('student-work/sw-13.jpg'), label: 'Wearable Body Piece' },
  { src: imageUrl('student-work/sw-14.jpg'), label: 'Parametric Wearable Harness' },
  { src: imageUrl('student-work/sw-18.jpg'), label: 'Corrugated Facade Prototype' },
  { src: imageUrl('student-work/sw-19.jpg'), label: 'Laser-Cut Wood Contour' },
  { src: imageUrl('student-work/sw-20.jpg'), label: 'Concrete 3D Printed Columns' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MarqueeTrack({ items, reverse }: { items: typeof ROW1; reverse?: boolean }) {
  // Render the fixed order first (matches the server HTML, so no hydration
  // mismatch), then shuffle once after mount. Duplicate for a seamless loop.
  const [shuffled, setShuffled] = useState(items);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only shuffle after hydration
    setShuffled(shuffle(items));
  }, [items]);
  const doubled = [...shuffled, ...shuffled];

  return (
    <div className={styles.trackWrap}>
      <div className={`${styles.track} ${reverse ? styles.reverse : ''}`}>
        {doubled.map((item, i) => (
          <div className={styles.card} key={i}>
            <Image
              src={item.src}
              alt={item.label}
              width={260}
              height={180}
              className={styles.img}
              loading="lazy"
            />
            <div className={styles.label}>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentWorkMarquee() {
  return (
    <section className={styles.section}>
      <div className="wrap">
        <div className="eyebrow">STUDENT WORK</div>
        <div className="section-head">
          <h2>What gets built in the course.</h2>
          <p className="note">Work produced by students during and after training.</p>
        </div>
      </div>
      <MarqueeTrack items={ROW1} />
      <div style={{ marginTop: 16 }}>
        <MarqueeTrack items={ROW2} reverse />
      </div>
    </section>
  );
}
