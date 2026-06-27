'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { StudentWork, Publication, Partner } from '@/lib/feature-wall';
import styles from './FeatureWall.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TOOL_LABEL: Record<string, string> = { rhino: 'Rhino3D', grasshopper: 'Grasshopper', rir: 'RIR' };
const PLACEHOLDERS = [1, 2, 3, 4];
const DESC_MAX = 300;
const IMG_MAX_MB = 2;
const IMG_MAX_BYTES = IMG_MAX_MB * 1024 * 1024;

type Props = { studentWork: StudentWork[]; publications: Publication[]; partners: Partner[]; };
type WorkForm = {
  name: string; role: string; project_title: string;
  tool: string; category: string; description: string; portfolio_url: string;
};
type PubForm = {
  author_name: string; author_role: string; title: string;
  magazine: string; pub_month: string; pub_year: string;
  description: string; article_url: string;
};

const EMPTY_WORK: WorkForm = { name: '', role: '', project_title: '', tool: 'rhino', category: '', description: '', portfolio_url: '' };
const EMPTY_PUB:  PubForm  = { author_name: '', author_role: '', title: '', magazine: '', pub_month: '', pub_year: '', description: '', article_url: '' };

function FileInput({ label, accept, maxMB, multiple, maxFiles, onChange }: {
  label: string; accept: string; maxMB: number; multiple?: boolean; maxFiles?: number;
  onChange: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [names, setNames]   = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(e.target.files ?? []);
    const errs: string[] = [];
    const valid: File[] = [];
    raw.slice(0, maxFiles ?? 1).forEach(f => {
      if (f.size > maxMB * 1024 * 1024) errs.push(`${f.name} exceeds ${maxMB}MB`);
      else valid.push(f);
    });
    setErrors(errs);
    setNames(valid.map(f => f.name));
    onChange(valid);
  }

  return (
    <div>
      <button type="button" className={styles.fileBtn} onClick={() => ref.current?.click()}>
        {names.length ? `${names.length} file${names.length > 1 ? 's' : ''} selected` : label}
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} onChange={handle} />
      {names.length > 0 && <p className={styles.fileNames}>{names.join(', ')}</p>}
      {errors.map((e, i) => <p key={i} className={styles.fileError}>{e}</p>)}
      <p className={styles.fileCap}>Max {maxMB}MB per file{maxFiles ? ` · up to ${maxFiles} images` : ''}</p>
    </div>
  );
}

export default function FeatureWall({ studentWork, publications, partners }: Props) {
  const [tab, setTab] = useState<'students' | 'publications' | 'partners'>('students');
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [showPubForm,  setShowPubForm]  = useState(false);
  const [workForm, setWorkForm] = useState<WorkForm>(EMPTY_WORK);
  const [pubForm,  setPubForm]  = useState<PubForm>(EMPTY_PUB);
  const [profilePhoto,   setProfilePhoto]   = useState<File[]>([]);
  const [projectImages,  setProjectImages]  = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [workDone,   setWorkDone]   = useState(false);
  const [pubDone,    setPubDone]    = useState(false);
  const [workError,  setWorkError]  = useState('');

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('site-images').upload(`${path}/${name}`, file, { upsert: false });
    if (error) return null;
    return name;
  }

  async function submitWork() {
    setWorkError('');
    if (!workForm.name || !workForm.project_title || !workForm.description) {
      setWorkError('Please fill in all required fields.');
      return;
    }
    if (workForm.description.length > DESC_MAX) {
      setWorkError(`Description must be ${DESC_MAX} characters or less.`);
      return;
    }
    setSubmitting(true);

    // upload profile photo
    let profile_photo_url: string | null = null;
    if (profilePhoto[0]) profile_photo_url = await uploadFile(profilePhoto[0], 'student-work/photos');

    // upload project images
    const project_image_urls: string[] = [];
    for (const img of projectImages.slice(0, 3)) {
      const url = await uploadFile(img, 'student-work/images');
      if (url) project_image_urls.push(url);
    }

    await supabase.from('student_work').insert([{
      ...workForm,
      status: 'pending',
      profile_photo_url,
      project_image_urls: project_image_urls.length ? project_image_urls : null,
    }]);

    setWorkForm(EMPTY_WORK);
    setProfilePhoto([]);
    setProjectImages([]);
    setShowWorkForm(false);
    setWorkDone(true);
    setSubmitting(false);
    setTimeout(() => setWorkDone(false), 5000);
  }

  async function submitPub() {
    if (!pubForm.author_name || !pubForm.title || !pubForm.description || !pubForm.pub_year) return;
    setSubmitting(true);
    await supabase.from('publications').insert([{
      ...pubForm,
      pub_year: parseInt(pubForm.pub_year),
      status: 'pending',
    }]);
    setPubForm(EMPTY_PUB);
    setShowPubForm(false);
    setPubDone(true);
    setSubmitting(false);
    setTimeout(() => setPubDone(false), 5000);
  }

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <div className={styles.formRow}>
      <label className={styles.formLabel}>{label}</label>
      {node}
      {hint && <p className={styles.fieldHint}>{hint}</p>}
    </div>
  );

  const descLeft = DESC_MAX - workForm.description.length;

  return (
    <div className={styles.wall}>
      <div className="eyebrow">Community</div>
      <h2 className={styles.heading}>Built with YAFT.</h2>
      <p className={styles.sub}>Student work, research, and the studios that train and collaborate with us.</p>

      <div className={styles.tabs}>
        {(['students', 'publications', 'partners'] as const).map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
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
                  {s.image_url ? <img src={s.image_url} alt={s.project_title} /> : <span className={styles.phIcon}>◈</span>}
                  <span className={`${styles.toolBadge} ${styles[s.tool] ?? ''}`}>{TOOL_LABEL[s.tool] ?? s.tool}</span>
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
            {PLACEHOLDERS.map(i => (
              <div key={`ph-${i}`} className={`${styles.scard} ${styles.placeholder}`}>
                <div className={`${styles.scardImg} ${styles.phImg}`}>
                  <span className={styles.phPlus}>＋</span>
                  <p className={styles.phText}>Your project<br />could be here</p>
                </div>
                <div className={styles.scardBody}>
                  <p className={styles.scardTitle} style={{ color: '#2a2a2a' }}>Project title</p>
                  <p className={styles.scardName}>Your name · Role</p>
                  <p className={styles.scardDesc}>Submit your work and get a public portfolio card.</p>
                </div>
              </div>
            ))}
          </div>

          {workDone && <p className={styles.successMsg}>Submitted! We'll review and feature it soon.</p>}

          {!showWorkForm
            ? <div className={styles.submitRow}>
                <button className={styles.submitBtn} onClick={() => setShowWorkForm(true)}>Submit your work →</button>
                <p className={styles.submitNote}>Trained with YAFT? Share what you built. We'll feature it here.</p>
              </div>
            : <div className={styles.form}>
                <p className={styles.formTitle}>Submit your project</p>

                {field('Your name *', <input className={styles.input} value={workForm.name} onChange={e => setWorkForm(f => ({...f, name: e.target.value}))} placeholder="Arjun R." />)}
                {field('Role / Institution *', <input className={styles.input} value={workForm.role} onChange={e => setWorkForm(f => ({...f, role: e.target.value}))} placeholder="M.Arch VIT" />)}
                {field('Project title *', <input className={styles.input} value={workForm.project_title} onChange={e => setWorkForm(f => ({...f, project_title: e.target.value}))} placeholder="Parametric Facade Rationalization" />)}
                {field('Tool used', <select className={styles.input} value={workForm.tool} onChange={e => setWorkForm(f => ({...f, tool: e.target.value}))}>
                  <option value="rhino">Rhino3D</option>
                  <option value="grasshopper">Grasshopper</option>
                  <option value="rir">Rhino.Inside.Revit</option>
                </select>)}
                {field('Category', <input className={styles.input} value={workForm.category} onChange={e => setWorkForm(f => ({...f, category: e.target.value}))} placeholder="Facade, BIM, Fabrication..." />)}

                <div className={styles.formRow}>
                  <label className={styles.formLabel}>Description * <span className={descLeft < 50 ? styles.capWarn : styles.capOk}>{descLeft} left</span></label>
                  <textarea
                    className={styles.input}
                    rows={3}
                    maxLength={DESC_MAX}
                    value={workForm.description}
                    onChange={e => setWorkForm(f => ({...f, description: e.target.value}))}
                    placeholder="What you built and how you used the tools."
                  />
                </div>

                {field('Portfolio / LinkedIn URL', <input className={styles.input} value={workForm.portfolio_url} onChange={e => setWorkForm(f => ({...f, portfolio_url: e.target.value}))} placeholder="https://linkedin.com/in/..." />)}

                <div className={styles.formDivider} />

                {field('Profile photo (optional)',
                  <FileInput label="Choose photo" accept="image/*" maxMB={IMG_MAX_MB} onChange={setProfilePhoto} />,
                  'A headshot or professional photo. Max 2MB.'
                )}

                {field('Project images (optional · 2–3 recommended)',
                  <FileInput label="Choose images" accept="image/*" maxMB={IMG_MAX_MB} multiple maxFiles={3} onChange={setProjectImages} />,
                  'Screenshots, renders, or drawings showing your work. Max 2MB each.'
                )}

                {workError && <p className={styles.fileError}>{workError}</p>}

                <div className={styles.formActions}>
                  <button className={styles.submitBtn} onClick={submitWork} disabled={submitting}>{submitting ? 'Uploading…' : 'Submit →'}</button>
                  <button className={styles.cancelBtn} onClick={() => { setShowWorkForm(false); setWorkError(''); }}>Cancel</button>
                </div>
              </div>
          }
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
                  {p.author_photo_url && <img className={styles.pubPhoto} src={p.author_photo_url} alt={p.author_name} />}
                  <div className={styles.pubContent}>
                    <div className={styles.pubMetaRow}>
                      <span className={styles.pubYear}>{p.pub_month} {p.pub_year}</span>
                      <span className={styles.pubMag}>{p.magazine}</span>
                    </div>
                    <p className={styles.pubTitle}>{p.title}</p>
                    <p className={styles.pubAuthor}>{p.author_name} · {p.author_role}</p>
                    <p className={styles.pubDesc}>{p.description}</p>
                    {p.article_url && <a className={styles.pubLink} href={p.article_url} target="_blank" rel="noopener">Read article →</a>}
                  </div>
                </div>
              </div>
            ))}
            <div className={styles.pubPh}><span className={styles.pubPhYr}>——</span><p className={styles.pubPhText}>Your paper, article, or thesis using Rhino or Grasshopper? Submit it here.</p></div>
            <div className={styles.pubPh}><span className={styles.pubPhYr}>——</span><p className={styles.pubPhText}>Research in computational design, BIM automation, or parametric fabrication welcome.</p></div>
          </div>

          {pubDone && <p className={styles.successMsg}>Submitted! We'll review and publish it soon.</p>}

          {!showPubForm
            ? <div className={styles.submitRow} style={{ marginTop: 20 }}>
                <button className={styles.submitBtn} onClick={() => setShowPubForm(true)}>Submit a publication →</button>
                <p className={styles.submitNote}>Papers, theses, articles, or case studies related to your YAFT training.</p>
              </div>
            : <div className={styles.form}>
                <p className={styles.formTitle}>Submit a publication</p>
                {field('Author name *', <input className={styles.input} value={pubForm.author_name} onChange={e => setPubForm(f => ({...f, author_name: e.target.value}))} placeholder="Dasun Siriwardena" />)}
                {field('Author role *', <input className={styles.input} value={pubForm.author_role} onChange={e => setPubForm(f => ({...f, author_role: e.target.value}))} placeholder="Principal Façade Engineer" />)}
                {field('Article title *', <input className={styles.input} value={pubForm.title} onChange={e => setPubForm(f => ({...f, title: e.target.value}))} placeholder="Title of the article or paper" />)}
                {field('Magazine / Journal', <input className={styles.input} value={pubForm.magazine} onChange={e => setPubForm(f => ({...f, magazine: e.target.value}))} placeholder="ACE Update Magazine" />)}
                {field('Month', <input className={styles.input} value={pubForm.pub_month} onChange={e => setPubForm(f => ({...f, pub_month: e.target.value}))} placeholder="Jun" />)}
                {field('Year *', <input className={styles.input} type="number" value={pubForm.pub_year} onChange={e => setPubForm(f => ({...f, pub_year: e.target.value}))} placeholder="2026" />)}
                {field('Description *', <textarea className={styles.input} rows={3} value={pubForm.description} onChange={e => setPubForm(f => ({...f, description: e.target.value}))} placeholder="Brief description of the article." />)}
                {field('Article URL', <input className={styles.input} value={pubForm.article_url} onChange={e => setPubForm(f => ({...f, article_url: e.target.value}))} placeholder="https://..." />)}
                <div className={styles.formActions}>
                  <button className={styles.submitBtn} onClick={submitPub} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit →'}</button>
                  <button className={styles.cancelBtn} onClick={() => setShowPubForm(false)}>Cancel</button>
                </div>
              </div>
          }
        </div>
      )}

      {/* PARTNERS */}
      {tab === 'partners' && (
        <div className={styles.partnerGrid}>
          {partners.map(p => (
            <div key={p.id} className={styles.pcard}>
              <div className={styles.pcardLogo}>
                {p.logo_url ? <img src={p.logo_url} alt={p.name} /> : <span className={styles.pcardInitial}>{p.name[0]}</span>}
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
