'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { fmtFixed2 } from '@/lib/format';

type Card = {
  planId: string; title: string; courseSlugs: string[]; currency: 'INR' | 'USD'; totalInr: number; paidInr: number; balanceInr: number;
  payStatus: 'unpaid' | 'advance_paid' | 'paid_in_full' | 'cancelled'; nextAction: 'pay_advance' | 'pay_balance' | 'pay_full' | null;
  allocationAmbiguous: boolean; payUrl: string; isTest: boolean;
  bills: { invoiceId: string; invoiceNo: string; date: string; taxable: number; gst: number; total: number }[];
  payments: { kind: string; paidAt: string | null; amountInr: number }[];
  creditNotes: { creditNoteNo: string; date: string | null; total: number | null }[];
};
type Me = {
  profile: { displayName: string | null; certificateName: string | null; phone: string | null; email: string; googleAvatar: string | null };
  enrolments: Card[]; candidates: { planId: string; title: string; createdAt: string }[]; totals: { courses: number; outstandingInr: number; certificates: number };
  projects: Proj[]; certificates: { certificateId: string; courseTitle: string; issuedOn: string; planId: string; courseSlug: string; verifyToken: string | null }[];
  certStatus: { planId: string; courseSlug: string; eligible: boolean; missing: string[] }[];
  testimonials: { id: string; planId: string; courseSlug: string; status: string; quote: string | null; publicName: string | null; photo: 'upload' | 'google' | 'none'; feedback: string | null }[];
};
type Rev = { id: string; revNo: number; status: string; title: string; description: string | null; links: string[]; coverPath: string | null; galleryPaths: string[]; privateFiles: { path: string; name: string; size: number }[]; feedback: string | null };
type Proj = { id: string; planId: string; courseSlug: string; status: string; publishConsent: boolean; publicDisplayName: string | null; published: boolean; latest: Rev | null; hasApproved: boolean };
const PSTATUS: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', changes_requested: 'Changes requested', approved: 'Approved' };

const TABS = ['My Courses', 'Payments & Bills', 'My Projects', 'Certificates & Verification'] as const;
const box = { border: '1px solid var(--line)', background: 'var(--paper)', padding: 16, marginBottom: 14 } as const;
const input = { background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '9px 10px', fontSize: 14, width: '100%' } as const;
const btn = { background: 'var(--ink)', color: 'var(--paper)', border: '1px solid var(--ink)', padding: '9px 14px', fontSize: 14, cursor: 'pointer' } as const;
const ghost = { ...btn, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' } as const;
const badge = (c: string) => ({ display: 'inline-block', fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 8px', border: `1px solid ${c}`, color: c }) as const;
const STATUS: Record<Card['payStatus'], [string, string]> = { unpaid: ['Pending checkout', '#ffb300'], advance_paid: ['Advance paid', '#4c8bf5'], paid_in_full: ['Paid in full', '#4caf50'], cancelled: ['Cancelled', '#999'] };
const inr = (n: number) => `₹${fmtFixed2(n)}`;
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function StudentClient() {
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading');
  const [tab, setTab] = useState<(typeof TABS)[number]>('My Courses');
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [profile, setProfile] = useState({ displayName: '', certificateName: '', phone: '' });
  const [showProfile, setShowProfile] = useState(false);
  const [interestOn, setInterestOn] = useState(false);
  const [edit, setEdit] = useState<{ key: string; title: string; description: string; links: string; publish: boolean; publicName: string } | null>(null);
  const [tf, setTf] = useState<{ key: string; quote: string; name: string; noPhoto: boolean } | null>(null);
  const [verify, setVerify] = useState<{ token: string; res: null | { valid: boolean; revoked?: boolean; name?: string; course?: string; date?: string; certificateId?: string } } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/student/me', { cache: 'no-store' });
    if (r.status === 401) { setState('out'); return; }
    if (!r.ok) { setMsg('Could not load your account. Please refresh.'); setState('out'); return; }
    const j: Me = await r.json();
    setMe(j); setState('in');
    setProfile({ displayName: j.profile.displayName ?? '', certificateName: j.profile.certificateName ?? '', phone: j.profile.phone ?? '' });
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const vt = p.get('verify');
    if (vt && /^[A-Za-z0-9_-]{16,40}$/.test(vt)) {
      fetch(`/api/student/verify/${vt}`, { cache: 'no-store' }).then((r) => r.json()).then((res) => setVerify({ token: vt, res })).catch(() => setVerify({ token: vt, res: { valid: false } }));
      return;
    }
    // Initial fetch on mount; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().then(async () => {
      if (p.get('auth') === 'failed') setMsg('Sign-in did not complete. Please try again.');
      const claim = p.get('claim');
      if (claim) {
        const r = await fetch('/api/student/claim/redeem', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: claim }) });
        const j = await r.json().catch(() => ({}));
        setMsg(r.ok ? 'Done. Your enrolment is now linked to this account.' : j.error ?? 'That link is not valid.');
        window.history.replaceState(null, '', '/student');
        if (r.ok) load();
      }
    });
  }, [load]);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=/student`;
  async function google() { await getSupabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } } }); }
  async function emailLink() {
    setBusy(true); setMsg('');
    const { error } = await getSupabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg('Could not send the link. Check the address and try again.'); else setSent(true);
  }
  async function signOut() { await getSupabaseBrowser().auth.signOut(); setMe(null); setState('out'); }
  async function post(url: string, body: unknown, method = 'POST') {
    const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, j: await r.json().catch(() => ({})) };
  }
  async function linkCandidates() {
    if (!me) return;
    const { ok, j } = await post('/api/student/link-by-email', { planIds: me.candidates.map((c) => c.planId) });
    setMsg(ok ? `Linked ${j.linked} enrolment(s).${j.needsReview ? ' Some need a quick check by our team.' : ''}` : j.error ?? 'Could not link.');
    load();
  }
  async function requestClaim() {
    const { j } = await post('/api/student/claim/request', { link });
    setMsg(j.message ?? 'Request received.'); setLink('');
  }
  async function setInterest(on: boolean) {
    const { ok } = await post('/api/student/interest-consent', { on });
    if (ok) { setInterestOn(on); setMsg(on ? 'Okay, we will remember the courses you look at.' : 'Stopped, and what we had is deleted.'); }
  }
  async function saveProfile() {
    const { ok, j } = await post('/api/student/profile', profile, 'PATCH');
    setMsg(ok ? 'Saved.' : j.error ?? 'Could not save.'); if (ok) { setShowProfile(false); load(); }
  }

  const startEdit = (e: Card, slug: string) => {
    const pr = me?.projects.find((x) => x.planId === e.planId && x.courseSlug === slug);
    setEdit({ key: `${e.planId}|${slug}`, title: pr?.latest?.title ?? '', description: pr?.latest?.description ?? '', links: (pr?.latest?.links ?? []).join('\n'), publish: pr?.publishConsent ?? false, publicName: pr?.publicDisplayName ?? me?.profile.displayName ?? '' });
  };
  async function saveProject(): Promise<boolean> {
    if (!edit) return false;
    const [planId, courseSlug] = edit.key.split('|');
    const { ok, j } = await post('/api/student/projects/save', { planId, courseSlug, title: edit.title, description: edit.description, links: edit.links.split('\n').map((x) => x.trim()).filter(Boolean) });
    setMsg(ok ? 'Draft saved.' : j.error ?? 'Could not save.'); if (ok) load(); return ok;
  }
  async function submitProject() {
    if (!edit || !(await saveProject())) return;
    const [planId, courseSlug] = edit.key.split('|');
    const { ok, j } = await post('/api/student/projects/submit', { planId, courseSlug, publish: edit.publish, publicName: edit.publicName });
    setMsg(ok ? 'Submitted for review.' : j.error ?? 'Could not submit.'); if (ok) { setEdit(null); load(); }
  }
  async function upload(kind: 'cover' | 'gallery' | 'private', f: File | undefined) {
    if (!edit || !f) return;
    const [planId, courseSlug] = edit.key.split('|');
    const fd = new FormData(); fd.set('file', f); fd.set('planId', planId); fd.set('courseSlug', courseSlug); fd.set('kind', kind);
    const r = await fetch('/api/student/projects/upload', { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Uploaded.' : j.error ?? 'Upload failed.'); if (r.ok) load();
  }

  async function withdraw(kind: 'project' | 'testimonial', id: string) {
    if (!window.confirm('Take this off the website? You can submit again later.')) return;
    const { ok, j } = await post('/api/student/withdraw', { kind, id });
    setMsg(ok ? 'Removed from the website.' : j.error ?? 'Could not remove.'); if (ok) load();
  }
  async function submitTestimonial() {
    if (!tf) return;
    const [planId, courseSlug] = tf.key.split('|');
    const { ok, j } = await post('/api/student/testimonials', { planId, courseSlug, quote: tf.quote, publicName: tf.name, noPhoto: tf.noPhoto });
    setMsg(ok ? 'Thank you. Your testimonial is with us for review.' : j.error ?? 'Could not submit.'); if (ok) { setTf(null); load(); }
  }
  async function uploadTestimonialPhoto(f: File | undefined) {
    if (!tf || !f) return;
    const [planId, courseSlug] = tf.key.split('|');
    const fd = new FormData(); fd.set('file', f); fd.set('planId', planId); fd.set('courseSlug', courseSlug);
    const r = await fetch('/api/student/testimonials/photo', { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Photo added.' : j.error ?? 'Upload failed.'); if (r.ok) { setTf({ ...tf, noPhoto: false }); load(); }
  }

  const wrap = { maxWidth: 860, margin: '0 auto', padding: '64px 20px', color: 'var(--ink)' } as const;
  if (verify) return (
    <main style={{ ...wrap, maxWidth: 520 }}>
      <h1 style={{ fontSize: 26, marginBottom: 12 }}>Certificate check</h1>
      {!verify.res ? <p>Checking...</p> : verify.res.valid ? (
        <div style={box}><span style={badge('#4caf50')}>Valid</span><p style={{ marginTop: 10 }}><strong>{verify.res.name}</strong><br />{verify.res.course}<br />{verify.res.date}<br /><span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{verify.res.certificateId}</span></p></div>
      ) : verify.res.revoked ? (
        <div style={box}><span style={badge('#c62828')}>Revoked</span><p style={{ marginTop: 10 }}>This certificate ({verify.res.certificateId}) is no longer valid.</p></div>
      ) : <div style={box}>We could not find a certificate for this link.</div>}
    </main>
  );
  if (state === 'loading') return <main style={wrap}><p>Loading...</p></main>;

  if (state === 'out') return (
    <main style={{ ...wrap, maxWidth: 440 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Student portal</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>Sign in to see your courses, payments, bills and certificates.</p>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}
      <div style={box}>
        <button style={{ ...btn, width: '100%' }} onClick={google}>Continue with Google</button>
        <p style={{ fontSize: 12, opacity: 0.65, margin: '8px 0 16px' }}>We only receive your name, email and picture from Google. Nothing is posted and no contacts are read.</p>
        {sent ? <p style={{ fontSize: 14 }}>Check your inbox. We sent a sign-in link to {email}.</p> : <>
          <input style={input} type="email" placeholder="Or use your email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button style={{ ...ghost, width: '100%', marginTop: 8 }} disabled={busy || !email.includes('@')} onClick={emailLink}>{busy ? 'Sending...' : 'Email me a sign-in link'}</button>
        </>}
      </div>
      <p style={{ fontSize: 12, opacity: 0.65 }}>Paid as a guest earlier? Sign in with the same email, then confirm your enrolment on the next screen.</p>
    </main>
  );

  if (!me) return null;
  const name = me.profile.displayName || me.profile.email;
  const certsReady: number = me.totals.certificates;
  return (
    <main style={wrap}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        {me.profile.googleAvatar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={me.profile.googleAvatar} alt="" width={48} height={48} referrerPolicy="no-referrer" style={{ borderRadius: '50%' }} />
          : <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)' }}>{initials(name)}</div>}
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>{name}</h1>
          <div style={{ fontSize: 13, opacity: 0.7 }}>{me.totals.courses} course{me.totals.courses === 1 ? '' : 's'} · Outstanding {inr(me.totals.outstandingInr)} · {certsReady} certificate{certsReady === 1 ? '' : 's'} available</div>
        </div>
        <button style={ghost} onClick={() => { setShowProfile((v) => !v); fetch('/api/student/interest-consent').then((r) => r.json()).then((j) => setInterestOn(!!j.on)).catch(() => {}); }}>Profile</button>
        <button style={ghost} onClick={signOut}>Sign out</button>
      </div>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}

      {showProfile && (
        <div style={box}>
          <label style={{ fontSize: 12 }}>Display name<input style={input} value={profile.displayName} maxLength={80} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label>
          <label style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Name on certificate (kept separate from your display name)<input style={input} value={profile.certificateName} maxLength={80} onChange={(e) => setProfile({ ...profile, certificateName: e.target.value })} /></label>
          <label style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Phone (optional)<input style={input} value={profile.phone} maxLength={20} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          <p style={{ fontSize: 12, opacity: 0.65, margin: '8px 0' }}>Signed in as {me.profile.email}. Changing your sign-in email never moves your enrolments.</p>
          <label style={{ fontSize: 12, display: 'block', margin: '8px 0' }}><input type="checkbox" checked={interestOn} onChange={(e) => setInterest(e.target.checked)} /> Remember which courses I look at while signed in, so YAFT can follow up helpfully. Off by default; switching it off deletes what was saved. Browsing alone never counts as marketing consent.</label>
          <button style={btn} onClick={saveProfile}>Save profile</button>
        </div>
      )}

      {me.candidates.length > 0 && (
        <div style={{ ...box, borderColor: 'var(--brass)' }}>
          <strong>We found {me.candidates.length} enrolment{me.candidates.length === 1 ? '' : 's'} paid with {me.profile.email}</strong>
          <ul style={{ margin: '8px 0', paddingLeft: 18, fontSize: 14 }}>{me.candidates.map((c) => <li key={c.planId}>{c.title}</li>)}</ul>
          <button style={btn} onClick={linkCandidates}>Yes, these are mine. Link them</button>
          <p style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>Nothing is linked until you confirm. Linking does not create any new bill or payment.</p>
        </div>
      )}

      <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={tab === t ? btn : ghost}>{t}</button>)}
      </div>

      {tab === 'My Courses' && (<>
        {me.enrolments.length === 0 && <div style={box}>No courses linked to this account yet. If you paid under another email, paste your payment link below and we will email a confirmation to the billing address on it.</div>}
        {me.enrolments.map((e) => {
          const [label, colour] = STATUS[e.payStatus];
          const isOpen = open === e.planId;
          return (
            <div key={e.planId} style={box}>
              <button onClick={() => setOpen(isOpen ? null : e.planId)} aria-expanded={isOpen} style={{ all: 'unset', cursor: 'pointer', display: 'flex', width: '100%', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <strong>{e.title}{e.isTest ? ' (test)' : ''}</strong><span style={badge(colour)}>{label}</span>
              </button>
              {isOpen && (
                <div style={{ marginTop: 12, fontSize: 14 }}>
                  <div>Course fee (with GST): {inr(e.totalInr)} · Paid: {inr(e.paidInr)} · Balance: {inr(e.balanceInr)}</div>
                  {e.allocationAmbiguous && <p style={{ fontSize: 12, opacity: 0.7 }}>This is a combo. Payments belong to the whole combo and are not split per course.</p>}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {e.nextAction && <a href={e.payUrl} style={{ ...btn, textDecoration: 'none' }}>{e.nextAction === 'pay_advance' ? 'Pay advance' : e.nextAction === 'pay_balance' ? 'Pay balance' : 'Pay in full'}</a>}
                    <button style={ghost} onClick={() => setTab('Payments & Bills')}>View bills</button>
                  </div>
                  {e.courseSlugs.map((slug) => {
                    const t = me.testimonials.find((x) => x.planId === e.planId && x.courseSlug === slug);
                    const key = `${e.planId}|${slug}`;
                    return (
                      <div key={key} style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                        <strong style={{ fontSize: 13 }}>Testimonial{e.courseSlugs.length > 1 ? `: ${slug}` : ''}</strong>{' '}
                        {t?.status === 'approved' && <button style={{ ...ghost, marginLeft: 8, padding: '3px 8px', fontSize: 12 }} onClick={() => withdraw('testimonial', t.id)}>Remove from website</button>}
                        {t && <span style={badge(t.status === 'approved' ? '#4caf50' : t.status === 'changes_requested' ? '#ffb300' : '#999')}>{t.status === 'submitted' ? 'With us for review' : t.status.replace('_', ' ')}</span>}
                        {t?.feedback && <p style={{ fontSize: 13, borderLeft: '3px solid var(--brass)', paddingLeft: 10 }}>Note from us: {t.feedback}</p>}
                        {t?.status !== 'submitted' && tf?.key !== key && <div><button style={{ ...ghost, marginTop: 8 }} onClick={() => setTf({ key, quote: t?.quote ?? '', name: t?.publicName ?? me.profile.displayName ?? '', noPhoto: t?.photo === 'none' && !!t })}>{t ? 'Edit testimonial' : 'Share a testimonial (optional)'}</button></div>}
                        {tf?.key === key && (
                          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                            <textarea style={{ ...input, minHeight: 100 }} maxLength={1200} placeholder="How was the course for you?" value={tf.quote} onChange={(ev) => setTf({ ...tf, quote: ev.target.value })} />
                            <input style={input} maxLength={80} placeholder="Name to show publicly" value={tf.name} onChange={(ev) => setTf({ ...tf, name: ev.target.value })} />
                            <div style={{ fontSize: 12 }}>Your photo (optional): <input type="file" accept="image/*" onChange={(ev) => uploadTestimonialPhoto(ev.target.files?.[0])} /></div>
                            <label style={{ fontSize: 12 }}><input type="checkbox" checked={tf.noPhoto} onChange={(ev) => setTf({ ...tf, noPhoto: ev.target.checked })} /> Do not show any photo</label>
                            <p style={{ fontSize: 12, opacity: 0.75, margin: 0 }}>
                              By submitting, you agree we may show this text and your name{tf.noPhoto ? '' : ', and your photo'} on our website after we review it.
                              {!tf.noPhoto && (t?.photo === 'upload' ? ' We will use the photo you uploaded.' : me.profile.googleAvatar ? ' If you do not upload an image, we will use your Google profile picture.' : '')}
                              {' '}Editing it later sends it back for review. You can ask us to remove it any time. This is never needed for your certificate.
                            </p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button style={btn} onClick={submitTestimonial}>Submit</button><button style={ghost} onClick={() => setTf(null)}>Cancel</button></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div style={box}>
          <strong>Paid under a different email?</strong>
          <p style={{ fontSize: 13, opacity: 0.75, margin: '6px 0' }}>Paste the payment link you received. We email a one-time confirmation to the billing address on that payment.</p>
          <input style={input} placeholder="https://www.yaftdesigns.com/pay/..." value={link} onChange={(e) => setLink(e.target.value)} />
          <button style={{ ...ghost, marginTop: 8 }} disabled={!link.trim()} onClick={requestClaim}>Send confirmation</button>
        </div>
      </>)}

      {tab === 'Payments & Bills' && (<>
        {me.enrolments.length === 0 && <div style={box}>Nothing to show yet.</div>}
        {me.enrolments.map((e) => (
          <div key={e.planId} style={box}>
            <strong>{e.title}</strong>
            <div style={{ fontSize: 13, opacity: 0.75, margin: '4px 0 10px' }}>Total {inr(e.totalInr)} · Paid {inr(e.paidInr)} · Balance {inr(e.balanceInr)}</div>
            {e.bills.length === 0 ? <p style={{ fontSize: 13 }}>No bills yet.</p> : (
              <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ textAlign: 'left' }}><th>Bill</th><th>Date</th><th>Base</th><th>GST</th><th>Total</th><th></th></tr></thead>
                <tbody>{e.bills.map((b) => <tr key={b.invoiceId}><td>{b.invoiceNo}</td><td>{b.date}</td><td>{inr(b.taxable)}</td><td>{inr(b.gst)}</td><td>{inr(b.total)}</td><td><a href={`/api/student/bills/${b.invoiceId}/pdf`}>Download</a></td></tr>)}</tbody>
              </table></div>
            )}
            {e.creditNotes.length > 0 && <p style={{ fontSize: 13, marginTop: 8 }}>Credit notes: {e.creditNotes.map((c) => `${c.creditNoteNo}${c.total !== null ? ` (${inr(c.total)})` : ''}`).join(', ')}</p>}
            {e.nextAction && <a href={e.payUrl} style={{ ...btn, textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>{e.nextAction === 'pay_advance' ? 'Pay advance' : e.nextAction === 'pay_balance' ? 'Pay balance' : 'Pay in full'}</a>}
            {e.payStatus === 'paid_in_full' && <span style={{ ...badge('#4caf50'), marginTop: 10 }}>Paid in full</span>}
          </div>
        ))}
      </>)}

      {tab === 'My Projects' && (<>
        {me.enrolments.filter((e) => e.payStatus !== 'cancelled' && e.courseSlugs.length > 0).length === 0 && <div style={box}>Link a course first, then you can submit your project here.</div>}
        {me.enrolments.filter((e) => e.payStatus !== 'cancelled').flatMap((e) => e.courseSlugs.map((slug) => {
          const pr = me.projects.find((x) => x.planId === e.planId && x.courseSlug === slug);
          const key = `${e.planId}|${slug}`;
          const lat = pr?.latest;
          const locked = lat?.status === 'submitted' || lat?.status === 'under_review';
          return (
            <div key={key} style={box}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong>{e.courseSlugs.length > 1 ? slug : e.title}</strong>
                <span style={badge(lat?.status === 'approved' ? '#4caf50' : lat?.status === 'changes_requested' ? '#ffb300' : '#999')}>{lat ? PSTATUS[lat.status] : 'Not started'}</span>
              </div>
              {lat && <p style={{ fontSize: 14, margin: '8px 0 0' }}><strong>{lat.title}</strong> (version {lat.revNo}){pr?.published ? ' · shown on Community Works' : ''}{pr?.published && <button style={{ ...ghost, marginLeft: 8, padding: '3px 8px', fontSize: 12 }} onClick={() => withdraw('project', pr.id)}>Withdraw from Community Works</button>}</p>}
              {lat?.feedback && <p style={{ fontSize: 13, borderLeft: '3px solid var(--brass)', paddingLeft: 10, marginTop: 8 }}>Reviewer note: {lat.feedback}</p>}
              {lat && <div style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{[lat.coverPath, ...lat.galleryPaths].filter((x): x is string => !!x).map((x) => <a key={x} href={`/api/student/projects/asset?path=${encodeURIComponent(x)}`} target="_blank" rel="noreferrer">image</a>)}{lat.privateFiles.map((f) => <a key={f.path} href={`/api/student/projects/asset?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer">{f.name} (private)</a>)}</div>}
              {!locked && edit?.key !== key && <button style={{ ...ghost, marginTop: 10 }} onClick={() => startEdit(e, slug)}>{!lat ? 'Start project' : lat.status === 'approved' ? 'Edit (creates a new version)' : 'Edit'}</button>}
              {locked && <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Locked while we review it.</p>}
              {edit?.key === key && (
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <input style={input} placeholder="Project title" maxLength={120} value={edit.title} onChange={(ev) => setEdit({ ...edit, title: ev.target.value })} />
                  <textarea style={{ ...input, minHeight: 110 }} placeholder="What did you make and how?" maxLength={4000} value={edit.description} onChange={(ev) => setEdit({ ...edit, description: ev.target.value })} />
                  <textarea style={{ ...input, minHeight: 60 }} placeholder="Links, one per line (https:// only)" value={edit.links} onChange={(ev) => setEdit({ ...edit, links: ev.target.value })} />
                  <div style={{ fontSize: 12 }}>Save the draft first, then add files. Cover image <input type="file" accept="image/*" onChange={(ev) => upload('cover', ev.target.files?.[0])} /> Gallery image <input type="file" accept="image/*" onChange={(ev) => upload('gallery', ev.target.files?.[0])} /> Private file (PDF, ZIP, .3dm; only we can see it) <input type="file" accept=".pdf,.zip,.3dm" onChange={(ev) => upload('private', ev.target.files?.[0])} /></div>
                  <label style={{ fontSize: 13 }}><input type="checkbox" checked={edit.publish} onChange={(ev) => setEdit({ ...edit, publish: ev.target.checked })} /> If approved, you may show this project (cover, gallery, title, description, links) on Community Works. Private files are never shown. You can withdraw this later.</label>
                  {edit.publish && <input style={input} placeholder="Name to show publicly" maxLength={80} value={edit.publicName} onChange={(ev) => setEdit({ ...edit, publicName: ev.target.value })} />}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button style={ghost} onClick={saveProject}>Save draft</button><button style={btn} onClick={submitProject}>Submit for review</button><button style={ghost} onClick={() => setEdit(null)}>Close</button></div>
                </div>
              )}
            </div>
          );
        }))}
      </>)}

      {tab === 'Certificates & Verification' && (<>
        {me.certificates.map((c) => (
          <div key={c.certificateId} style={box}>
            <strong>{c.courseTitle}</strong> <span style={badge('#4caf50')}>Issued</span>
            <div style={{ fontSize: 13, opacity: 0.75, margin: '6px 0' }}>{c.certificateId} · {c.issuedOn}{me.profile.certificateName ? '' : ' · set your certificate name in Profile'}</div>
            <a href={`/api/student/certificates/${c.certificateId}/pdf`} style={{ ...btn, textDecoration: 'none', display: 'inline-block' }}>Download certificate</a>
            {c.verifyToken && <p style={{ fontSize: 12, marginTop: 8 }}>Verification link: <code>{typeof window !== 'undefined' ? window.location.origin : ''}/student?verify={c.verifyToken}</code></p>}
          </div>
        ))}
        {me.certStatus.filter((c) => !me.certificates.some((x) => x.planId === c.planId && x.courseSlug === c.courseSlug)).map((c) => (
          <div key={`${c.planId}|${c.courseSlug}`} style={box}>
            <strong>{c.courseSlug}</strong> <span style={badge('#999')}>Not yet</span>
            <p style={{ fontSize: 13, margin: '6px 0 0' }}>Still needed: {c.missing.join(', ') || 'We are preparing it'}.{!me.profile.certificateName && ' Also set your certificate name in Profile.'}</p>
          </div>
        ))}
        {me.certStatus.length === 0 && me.certificates.length === 0 && <div style={box}>No certificates yet.</div>}
        <p style={{ fontSize: 12, opacity: 0.65 }}>To check a certificate code, use the <a href="/certificates">certificate check page</a>.</p>
      </>)}
    </main>
  );
}
