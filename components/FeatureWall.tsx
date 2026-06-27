'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { StudentWork, Publication, Partner } from '@/lib/feature-wall';
import styles from './FeatureWall.module.css';

const TOOL_LABEL: Record<string, string> = {
  rhino: 'Rhino3D',
  grasshopper: 'Grasshopper',
  rir: 'RIR',
};

const PLACEHOLDERS = [1, 2, 3, 4];

type Props = {
  studentWork: StudentWork[];
  publications: Publication[];
  partners: Partner[];
};

export default function FeatureWall({ studentWork, publications, partners }: Props) {
  const [tab, setTab] = useState<'students' | 'publications' | 'partners'>('students');

  return (
    <div className={styles.wall}>
      <div className="eyebrow">Community</div>
      <h2 className={styles.heading}>Built with YAFT.</h2>
      <p className={styles.sub}>Student work, research, and the studios that train and collaborate with us.</p>

      {/* tabs */}
      <div className={styles.tabs}>
        {(['students', 'publications', 'partners'] as const).map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'students' ? 'Student Work' : t === 'publications' ? 'Publications' : 'Partners & Institutions'}
          </button>
        ))}
      </div>

      {/* STUDENT WORK */}
      {tab === 'students' && (
        <div>
          <div className={styles.cardTrack}>
            {studentWork.map(s => (
              <div key={s.id} className={styles.scard}>
                <div className={styles.scardImg} style={{ background: '#111' }}>
                  {s.image_url
                    ? <img src={s.image_url} alt={s.project_title} />
                    : <span className={styles.phIcon}>◈</span>}
                  <span className={`${styles.toolBadge} ${styles[s.tool] ?? ''}`}>
                    {TOOL_LABEL[s.tool] ?? s.tool}
                  </span>
                </div>
                <div className={styles.scardBody}>
                  <p className={styles.scardTitle}>{s.project_title}</p>
                  <p className={styles.scardName}>{s.name} · {s.role}</p>
                  <p className={styles.scardDesc}>{s.description}</p>
                  <div className={styles.scardFoot}>
                    <span className={styles.stag}>{s.category}</span>
                    {s.portfolio_url && <a className={styles.slink} href={s.portfolio_url} target="_blank" rel="noopener">Portfolio →</a>}
                  </div>
                </div>
              </div>
            ))}

            {/* placeholders */}
            {PLACEHOLDERS.map(i => (
              <div key={`ph-${i}`} className={`${styles.scard} ${styles.placeholder}`}>
                <div className={`${styles.scardImg} ${styles.phImg}`}>
                  <span className={styles.phPlus}>＋</span>
                  <p className={styles.phText}>Your project<br />could be here</p>
                </div>
                <div className={styles.scardBody}>
                  <p className={styles.scardTitle} style={{ color: '#2a2a2a' }}>Project title</p>
                  <p className={styles.scardName}>Your name · Role</p>
                  <p className={styles.scardDesc}>Submit your work and get a public portfolio card linked to your profile.</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.submitRow}>
            <a className={styles.submitBtn} href="mailto:yaftdesigns@gmail.com?subject=Submit My Work — YAFT Feature Wall">
              Submit your work →
            </a>
            <p className={styles.submitNote}>Trained with YAFT? Share what you built. We'll feature it here.</p>
          </div>
        </div>
      )}

      {/* PUBLICATIONS */}
      {tab === 'publications' && (
        <div>
          <div className={styles.pubList}>
            {publications.map(p => (
              <div key={p.id} className={styles.pubCard}>
                <div className={styles.pubAccent} />
                <div className={styles.pubInner}>
                  {p.author_photo_url && (
                    <img className={styles.pubPhoto} src={p.author_photo_url} alt={p.author_name} />
                  )}
                  <div className={styles.pubContent}>
                    <div className={styles.pubMetaRow}>
                      <span className={styles.pubYear}>{p.pub_month} {p.pub_year}</span>
                      <span className={styles.pubMag}>{p.magazine}</span>
                    </div>
                    <p className={styles.pubTitle}>{p.title}</p>
                    <p className={styles.pubAuthor}>{p.author_name} · {p.author_role}</p>
                    <p className={styles.pubDesc}>{p.description}</p>
                    {p.article_url && (
                      <a className={styles.pubLink} href={p.article_url} target="_blank" rel="noopener">
                        Read article →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* placeholders */}
            <div className={styles.pubPh}>
              <span className={styles.pubPhYr}>——</span>
              <p className={styles.pubPhText}>Your paper, article, or thesis using Rhino or Grasshopper? Submit it and we'll list it here.</p>
            </div>
            <div className={styles.pubPh}>
              <span className={styles.pubPhYr}>——</span>
              <p className={styles.pubPhText}>Research in computational design, BIM automation, or parametric fabrication welcome.</p>
            </div>
          </div>

          <div className={styles.submitRow}>
            <a className={styles.submitBtn} href="mailto:yaftdesigns@gmail.com?subject=Submit Publication — YAFT Feature Wall">
              Submit a publication →
            </a>
            <p className={styles.submitNote}>Papers, theses, articles, or case studies related to your YAFT training.</p>
          </div>
        </div>
      )}

      {/* PARTNERS */}
      {tab === 'partners' && (
        <div className={styles.partnerGrid}>
          {partners.map(p => (
            <div key={p.id} className={styles.pcard}>
              <div className={styles.pcardLogo}>
                {p.logo_url
                  ? <img src={p.logo_url} alt={p.name} />
                  : <span className={styles.pcardInitial}>{p.name[0]}</span>}
              </div>
              <div className={styles.pcardBody}>
                <p className={styles.pcardName}>{p.name}</p>
                <p className={styles.pcardDesc}>{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
