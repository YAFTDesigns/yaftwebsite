'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { fmtFixed2 } from '@/lib/format';
import VerifiedBadge from '@/components/VerifiedBadge';

type Card = {
  planId: string; title: string; courseSlugs: string[]; currency: 'INR' | 'USD'; totalInr: number; paidInr: number; balanceInr: number;
  payStatus: 'unpaid' | 'advance_paid' | 'paid_in_full' | 'cancelled'; nextAction: 'pay_advance' | 'pay_balance' | 'pay_full' | null;
  allocationAmbiguous: boolean; payUrl: string; isTest: boolean;
  bills: { invoiceId: string; invoiceNo: string; date: string; taxable: number; gst: number; total: number }[];
  payments: { kind: string; paidAt: string | null; amountInr: number }[];
  creditNotes: { creditNoteNo: string; date: string | null; total: number | null }[];
};
type Me = {
  profile: { displayName: string | null; certificateName: string | null; phone: string | null; email: string; googleAvatar: string | null; linkedinUrl: string | null; linkedinConnected: boolean; linkedinEnabled: boolean; badgeConsent: boolean; verified: boolean };
  enrolments: Card[]; candidates: { planId: string; title: string; createdAt: string }[]; totals: { courses: number; outstandingInr: number; certificates: number };
  projects: Proj[]; certificates: { certificateId: string; courseTitle: string; issuedOn: string; planId: string; courseSlug: string; verifyToken: string | null }[];
  certStatus: { planId: string; courseSlug: string; eligible: boolean; missing: string[] }[];
  testimonials: { id: string; planId: string; courseSlug: string; status: string; quote: string | null; publicName: string | null; photo: 'upload' | 'google' | 'none'; feedback: string | null }[];
};
type Rev = { id: string; revNo: number; status: string; title: string; description: string | null; links: string[]; coverPath: string | null; galleryPaths: string[]; privateFiles: { path: string; name: string; size: number }[]; feedback: string | null };
type Proj = { id: string; planId: string; courseSlug: string; status: string; publishConsent: boolean; publicDisplayName: string | null; published: boolean; latest: Rev | null; hasApproved: boolean; role: string | null; tool: string | null; category: string | null; hasProfilePhoto: boolean };
const PSTATUS: Record<string, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', changes_requested: 'Changes requested', approved: 'Approved' };

const TABS = ['My Courses', 'Payments & Bills', 'My Projects', 'Certificates & Verification'] as const;
const box = { border: '1px solid var(--line)', borderLeft: '3px solid var(--blueprint)', background: 'var(--paper-2)', padding: '20px 22px', marginBottom: 16 } as const;
const input = { background: 'var(--paper)', border: '1px solid #3a3a3a', color: 'var(--ink)', padding: '11px 12px', fontSize: 14, width: '100%', fontFamily: 'var(--display)', marginTop: 4 } as const;
const btn = { background: 'var(--brass)', color: '#fff', border: '1px solid var(--brass)', padding: '11px 22px', fontSize: 13, fontFamily: 'var(--mono)', letterSpacing: '.04em', fontWeight: 500, cursor: 'pointer', borderRadius: 0 } as const;
const ghost = { ...btn, background: 'transparent', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.6)' } as const;
const tabBtn = (on: boolean) => ({ background: 'transparent', color: on ? 'var(--ink)' : 'var(--ink-soft)', border: 'none', borderBottom: `2px solid ${on ? 'var(--blueprint)' : 'transparent'}`, padding: '12px 18px', fontSize: 13, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: -1 }) as const;
const BTN_CSS = `
.sp{font-family:var(--display);line-height:1.55}
.sp p,.sp label,.sp td,.sp th,.sp li,.sp div{font-family:var(--display)}
.sp .mono{font-family:var(--mono)}
.sp button:not(:disabled):hover,.sp a[style*="border"]:hover{filter:brightness(1.15)}
.sp button:disabled{opacity:.4;cursor:not-allowed}
.sp button:focus-visible,.sp a:focus-visible,.sp input:focus-visible,.sp select:focus-visible,.sp textarea:focus-visible{outline:2px solid var(--blueprint);outline-offset:2px}
.sp input,.sp select,.sp textarea{border-radius:0}
.sp input:focus,.sp select:focus,.sp textarea:focus{border-color:var(--blueprint)!important}
.sp table{border-collapse:collapse;width:100%}
.sp th{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
.sp td{padding:10px;border-bottom:1px solid var(--line)}
.sp a{color:var(--blueprint)}
.sp a[style*="background"]{color:#fff}
.sp h2,.sp h3{font-family:var(--display)}
.sp-hero{border-bottom:1px solid var(--line);padding:8px 0 30px;margin-bottom:26px}
.sp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:22px}
.sp-stat{border:1px solid var(--line);background:var(--paper-2);padding:14px 16px}
.sp-stat b{display:block;font-family:var(--display);font-size:26px;font-weight:600;color:var(--ink)}
.sp-stat span{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft)}
.sp-tabs{display:flex;gap:2px;flex-wrap:wrap;border-bottom:1px solid var(--line);margin-bottom:22px}
`;
function GoogleG() { return (<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ marginRight: 10, verticalAlign: 'middle' }}><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.200 0 11.500-2 15.300-5.600l-7.500-5.800c-2.100 1.400-4.800 2.300-7.8 2.300-6.300 0-11.700-4-13.600-9.800l-7.8 6.1C6.500 42.6 14.600 48 24 48z"/></svg>); }
function LinkedInIn() { return (<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ marginRight: 10, verticalAlign: 'middle' }}><rect width="24" height="24" rx="3" fill="#fff"/><path fill="#0A66C2" d="M4.500 9h3v10.500h-3zM6 4.200a1.800 1.800 0 110 3.600 1.800 1.800 0 010-3.600zM9.800 9h2.900v1.400h.1c.4-.8 1.400-1.700 2.900-1.700 3.100 0 3.700 2 3.700 4.700v6.1h-3v-5.400c0-1.300 0-2.900-1.800-2.900s-2 1.400-2 2.800v5.500h-3z"/></svg>); }
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
  const [profile, setProfile] = useState({ displayName: '', certificateName: '', phone: '', linkedinUrl: '' });
  const [showProfile, setShowProfile] = useState(false);
  const [interestOn, setInterestOn] = useState(false);
  const [edit, setEdit] = useState<{ key: string; name: string; role: string; title: string; tool: string; category: string; description: string; link: string; publish: boolean } | null>(null);
  const [tf, setTf] = useState<{ key: string; quote: string; name: string; noPhoto: boolean } | null>(null);
  const [verify, setVerify] = useState<{ token: string; res: null | { valid: boolean; revoked?: boolean; name?: string; course?: string; date?: string; certificateId?: string } } | null>(null);

  const load = useCallback(async (): Promise<Me | null> => {
    const r = await fetch('/api/student/me', { cache: 'no-store' });
    if (r.status === 401) { setState('out'); return null; }
    if (!r.ok) { setMsg('Could not load your account. Please refresh.'); setState('out'); return null; }
    const j: Me = await r.json();
    setMe(j); setState('in');
    setProfile({ displayName: j.profile.displayName ?? '', certificateName: j.profile.certificateName ?? '', phone: j.profile.phone ?? '', linkedinUrl: j.profile.linkedinUrl ?? '' });
    return j;
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
    load().then(async (loaded) => {
      const want = p.get('submit');
      if (loaded && (want || p.get('tab') === 'projects')) {
        setTab('My Projects');
        const hit = want ? loaded.enrolments.find((e) => e.payStatus !== 'cancelled' && e.payStatus !== 'unpaid' && e.courseSlugs.includes(want)) : null;
        if (hit && want) openEditor(loaded, hit, want);
        else if (want) setMsg('We could not find a paid enrolment for that course on this account yet.');
      }
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
  async function connectLinkedin() {
    const { error } = await getSupabaseBrowser().auth.linkIdentity({ provider: 'linkedin_oidc', options: { redirectTo: redirectTo() } });
    if (error) setMsg('Could not start the LinkedIn connection. Please try again later.');
  }
  async function setBadge(on: boolean) {
    const { ok, j } = await post('/api/student/badge', { on });
    setMsg(ok ? (on ? 'Done. The Verified shield can now show next to your published work.' : 'The shield is switched off, and removed from anything already public.') : j.error ?? 'Could not change that.'); if (ok) load();
  }
  async function setInterest(on: boolean) {
    const { ok } = await post('/api/student/interest-consent', { on });
    if (ok) { setInterestOn(on); setMsg(on ? 'Okay, we will remember the courses you look at.' : 'Stopped, and what we had is deleted.'); }
  }
  async function saveProfile() {
    const { ok, j } = await post('/api/student/profile', profile, 'PATCH');
    setMsg(ok ? 'Saved.' : j.error ?? 'Could not save.'); if (ok) { setShowProfile(false); load(); }
  }

  // Opens the project form for one course, prefilled with what we already know about this student and course.
  function openEditor(m: Me, e: Card, slug: string) {
    const pr = m.projects.find((x) => x.planId === e.planId && x.courseSlug === slug);
    setEdit({
      key: `${e.planId}|${slug}`, name: pr?.publicDisplayName ?? m.profile.displayName ?? '', role: pr?.role ?? 'YAFT Designs student', title: pr?.latest?.title ?? '',
      tool: pr?.tool ?? (slug.includes('grasshopper') ? 'grasshopper' : slug.includes('revit') ? 'rir' : 'rhino'), category: pr?.category ?? '',
      description: pr?.latest?.description ?? '', link: (pr?.latest?.links ?? [])[0] ?? '', publish: pr?.publishConsent ?? false,
    });
  }
  const startEdit = (e: Card, slug: string) => { if (me) openEditor(me, e, slug); };
  async function saveProject(): Promise<boolean> {
    if (!edit) return false;
    const [planId, courseSlug] = edit.key.split('|');
    const { ok, j } = await post('/api/student/projects/save', { planId, courseSlug, title: edit.title, description: edit.description, links: edit.link.trim() ? [edit.link.trim()] : [], role: edit.role, tool: edit.tool, category: edit.category });
    setMsg(ok ? 'Draft saved.' : j.error ?? 'Could not save.'); if (ok) load(); return ok;
  }
  async function uploadImages(files: FileList | null, pr: Proj | undefined) {
    if (!files) return;
    // First image becomes the cover if there is none yet; the rest go to the gallery. Up to 3 in total.
    let hasCover = !!pr?.latest?.coverPath;
    for (const f of Array.from(files).slice(0, 3)) { await upload(hasCover ? 'gallery' : 'cover', f); hasCover = true; }
  }
  async function removeFile(path: string) {
    if (!edit) return;
    const [planId, courseSlug] = edit.key.split('|');
    const { ok, j } = await post('/api/student/projects/remove-file', { planId, courseSlug, path });
    setMsg(ok ? 'Removed.' : j.error ?? 'Could not remove.'); if (ok) load();
  }
  async function submitProject() {
    if (!edit || !(await saveProject())) return;
    const [planId, courseSlug] = edit.key.split('|');
    const { ok, j } = await post('/api/student/projects/submit', { planId, courseSlug, publish: edit.publish, publicName: edit.name });
    setMsg(ok ? 'Submitted for review.' : j.error ?? 'Could not submit.'); if (ok) { setEdit(null); load(); }
  }
  async function upload(kind: 'cover' | 'gallery' | 'private' | 'profile', f: File | undefined) {
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

  const wrap = { maxWidth: 1040, margin: '0 auto', padding: '28px 32px 72px', color: 'var(--ink)' } as const;
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
    <main className="sp" style={{ ...wrap, maxWidth: 480, paddingTop: 56 }}>
      <style>{BTN_CSS}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/logos/yaft-square-logo.png" alt="YAFT Designs" width={64} height={64} style={{ display: 'block', marginBottom: 16, borderRadius: 6 }} />
      <div className="eyebrow" style={{ marginBottom: 14 }}>STUDENT PORTAL</div>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', lineHeight: 1.08, marginBottom: 12 }}>Your courses, bills and certificates.</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 24, fontSize: 16 }}>Sign in to see your courses, payments, bills and certificates.</p>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}
      <div style={box}>
        <button style={{ ...btn, width: '100%', background: '#fff', color: '#1f1f1f', border: '2px solid #fff', padding: '12px 18px' }} onClick={google}><GoogleG />Continue with Google</button>
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
    <main className="sp" style={wrap}>
      <style>{BTN_CSS}</style>
      <div className="sp-hero">
        <div className="eyebrow" style={{ marginBottom: 16 }}>STUDENT PORTAL</div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          {me.profile.googleAvatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={me.profile.googleAvatar} alt="" width={64} height={64} referrerPolicy="no-referrer" style={{ borderRadius: '50%', border: '2px solid var(--blueprint)' }} />
            : <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--blueprint)', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)' }}>{initials(name)}</div>}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', lineHeight: 1.1, margin: 0 }}>{name}{me.profile.linkedinConnected && me.totals.courses > 0 && <VerifiedBadge size={24} />}</h1>
            <div className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>{me.profile.email}</div>
          </div>
          <button style={ghost} onClick={() => { setShowProfile((v) => !v); fetch('/api/student/interest-consent').then((r) => r.json()).then((j) => setInterestOn(!!j.on)).catch(() => {}); }}>Profile</button>
          <button style={ghost} onClick={signOut}>Sign out</button>
        </div>
        <div className="sp-stats">
          <div className="sp-stat"><b>{me.totals.courses}</b><span>Courses</span></div>
          <div className="sp-stat"><b>{inr(me.totals.outstandingInr)}</b><span>Outstanding</span></div>
          <div className="sp-stat"><b>{certsReady}</b><span>Certificates</span></div>
        </div>
      </div>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}

      {showProfile && (
        <div style={box}>
          <label style={{ fontSize: 12 }}>Display name<input style={input} value={profile.displayName} maxLength={80} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label>
          <label style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Name on certificate (kept separate from your display name)<input style={input} value={profile.certificateName} maxLength={80} onChange={(e) => setProfile({ ...profile, certificateName: e.target.value })} /></label>
          <label style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Phone (optional)<input style={input} value={profile.phone} maxLength={20} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <strong style={{ fontSize: 13 }}>Verified student shield <VerifiedBadge /></strong>
            <p style={{ fontSize: 12, opacity: 0.75, margin: '4px 0 8px' }}>Connect your LinkedIn account and you get a blue shield beside your name on testimonials, Community Works and, later, the student forum. It shows you are a real YAFT student. Typing a link is not enough; you sign in to LinkedIn once so we know the account is yours.</p>
            {me.profile.linkedinConnected
              ? <p style={{ fontSize: 13, margin: '0 0 8px' }}>LinkedIn connected ✓</p>
              : me.profile.linkedinEnabled ? <button style={{ ...btn, background: '#0A66C2', border: '2px solid #0A66C2' }} onClick={connectLinkedin}><LinkedInIn />Connect LinkedIn</button> : <p style={{ fontSize: 12, opacity: 0.7 }}>LinkedIn connection is coming soon.</p>}
            <label style={{ fontSize: 12, display: 'block', marginTop: 8 }}>Your public LinkedIn address (optional, shown as a link next to your testimonial)<input style={input} placeholder="linkedin.com/in/yourname" value={profile.linkedinUrl} onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })} /></label>
            <label style={{ fontSize: 12, display: 'block', marginTop: 8, opacity: me.profile.linkedinConnected ? 1 : 0.5 }}><input type="checkbox" disabled={!me.profile.linkedinConnected} checked={me.profile.badgeConsent} onChange={(e) => setBadge(e.target.checked)} /> Show the Verified shield (and my LinkedIn link) next to my published testimonials and projects. I can switch this off any time.</label>
          </div>
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

      <div role="tablist" className="sp-tabs">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>{t}</button>)}
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
                    {e.payStatus !== 'unpaid' && e.payStatus !== 'cancelled' && e.courseSlugs[0] && <button style={ghost} onClick={() => { setTab('My Projects'); startEdit(e, e.courseSlugs[0]); }}>Submit project</button>}
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
        <p style={{ fontSize: 13, opacity: 0.8 }}>Your certificate needs an approved project. Fill in the card below the same way as on our Community Works page. We review it, and if you allow it, it is shown there.</p>
        {me.enrolments.filter((e) => e.payStatus !== 'cancelled' && e.payStatus !== 'unpaid' && e.courseSlugs.length > 0).length === 0 && <div style={box}>Once your first payment is in, you can submit your project here.</div>}
        {me.enrolments.filter((e) => e.payStatus !== 'cancelled' && e.payStatus !== 'unpaid').flatMap((e) => e.courseSlugs.map((slug) => {
          const pr = me.projects.find((x) => x.planId === e.planId && x.courseSlug === slug);
          const key = `${e.planId}|${slug}`;
          const lat = pr?.latest;
          const locked = lat?.status === 'submitted' || lat?.status === 'under_review';
          const imgs = lat ? [lat.coverPath, ...lat.galleryPaths].filter((x): x is string => !!x) : [];
          const descLeft = edit?.key === key ? 300 - edit.description.length : 300;
          const label = { display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 } as const;
          return (
            <div key={key} style={box}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong>{e.courseSlugs.length > 1 ? slug : e.title}</strong>
                <span style={badge(lat?.status === 'approved' ? '#4caf50' : lat?.status === 'changes_requested' ? '#ffb300' : '#999')}>{lat ? PSTATUS[lat.status] : 'Not started'}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4, wordBreak: 'break-all' }}>Direct link to this form: {typeof window !== 'undefined' ? window.location.origin : ''}/student?submit={slug}</div>
              {lat && <p style={{ fontSize: 14, margin: '8px 0 0' }}><strong>{lat.title}</strong> (version {lat.revNo}){pr?.published ? ' · shown on Community Works' : ''}{pr?.published && <button style={{ ...ghost, marginLeft: 8, padding: '3px 8px', fontSize: 12 }} onClick={() => withdraw('project', pr.id)}>Withdraw from Community Works</button>}</p>}
              {lat?.feedback && <p style={{ fontSize: 13, borderLeft: '3px solid var(--brass)', paddingLeft: 10, marginTop: 8 }}>Reviewer note: {lat.feedback}</p>}
              {edit?.key !== key && lat && <div style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{imgs.map((x, i) => <a key={x} href={`/api/student/projects/asset?path=${encodeURIComponent(x)}`} target="_blank" rel="noreferrer">image {i + 1}</a>)}{lat.privateFiles.map((f) => <a key={f.path} href={`/api/student/projects/asset?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer">{f.name} (private)</a>)}</div>}
              {!locked && edit?.key !== key && <button style={{ ...ghost, marginTop: 10 }} onClick={() => startEdit(e, slug)}>{!lat ? 'Submit your project' : lat.status === 'approved' ? 'Edit (creates a new version)' : 'Edit'}</button>}
              {locked && <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Locked while we review it.</p>}
              {edit?.key === key && (
                <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                  <div><label style={label}>Your name *</label><input style={input} maxLength={80} value={edit.name} placeholder="Arjun R." onChange={(ev) => setEdit({ ...edit, name: ev.target.value })} /></div>
                  <div><label style={label}>Role / Institution *</label><input style={input} maxLength={80} value={edit.role} placeholder="M.Arch VIT" onChange={(ev) => setEdit({ ...edit, role: ev.target.value })} /></div>
                  <div><label style={label}>Project title *</label><input style={input} maxLength={120} value={edit.title} placeholder="Parametric Facade Rationalization" onChange={(ev) => setEdit({ ...edit, title: ev.target.value })} /></div>
                  <div><label style={label}>Tool used</label><select style={input} value={edit.tool} onChange={(ev) => setEdit({ ...edit, tool: ev.target.value })}><option value="rhino">Rhino3D</option><option value="grasshopper">Grasshopper</option><option value="rir">Rhino.Inside.Revit</option></select></div>
                  <div><label style={label}>Category</label><input style={input} maxLength={60} value={edit.category} placeholder="Facade, BIM, Fabrication..." onChange={(ev) => setEdit({ ...edit, category: ev.target.value })} /></div>
                  <div><label style={label}>Description * <span style={{ color: descLeft < 50 ? '#ffb300' : undefined }}>{descLeft} left</span></label><textarea style={{ ...input, minHeight: 90 }} maxLength={300} value={edit.description} placeholder="What you built and how you used the tools." onChange={(ev) => setEdit({ ...edit, description: ev.target.value })} /></div>
                  <div><label style={label}>Portfolio, LinkedIn or Instagram URL</label><input style={input} value={edit.link} placeholder="https://linkedin.com/in/..." onChange={(ev) => setEdit({ ...edit, link: ev.target.value })} /></div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--line)', width: '100%' }} />
                  <p style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>Save the draft first, then add pictures and files.</p>
                  <div><label style={label}>Profile photo (optional){pr?.hasProfilePhoto ? ' · added' : ''}</label><input type="file" accept="image/*" onChange={(ev) => upload('profile', ev.target.files?.[0])} /></div>
                  <div><label style={label}>Project images (optional · 2–3 recommended)</label><input type="file" accept="image/*" multiple onChange={(ev) => uploadImages(ev.target.files, pr)} />
                    <div style={{ fontSize: 12, marginTop: 6 }}>{imgs.map((x, i) => <span key={x} style={{ marginRight: 12 }}>image {i + 1} <button style={{ ...ghost, padding: '1px 6px', fontSize: 11 }} onClick={() => removeFile(x)}>remove</button></span>)}</div></div>
                  <div><label style={label}>Supporting files (PDF, ZIP or .3dm; private, only we can see them)</label><input type="file" accept=".pdf,.zip,.3dm" onChange={(ev) => upload('private', ev.target.files?.[0])} />
                    <div style={{ fontSize: 12, marginTop: 6 }}>{(lat?.privateFiles ?? []).map((f) => <span key={f.path} style={{ marginRight: 12 }}>{f.name} <button style={{ ...ghost, padding: '1px 6px', fontSize: 11 }} onClick={() => removeFile(f.path)}>remove</button></span>)}</div></div>
                  <label style={{ fontSize: 13 }}><input type="checkbox" checked={edit.publish} onChange={(ev) => setEdit({ ...edit, publish: ev.target.checked })} /> If approved, show this project card (name, role, title, description, images, link and profile photo) on Community Works. Private files are never shown. You can withdraw it later.</label>
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
            <p style={{ fontSize: 13, margin: '6px 0 0' }}>Still needed: {c.missing.join(', ') || 'We are preparing it'}.{c.missing.includes('Project approval') && <> <a href={`/student?submit=${c.courseSlug}`} style={{ textDecoration: 'underline' }}>Submit your project</a>.</>}{!me.profile.certificateName && ' Also set your certificate name in Profile.'}</p>
          </div>
        ))}
        {me.certStatus.length === 0 && me.certificates.length === 0 && <div style={box}>No certificates yet.</div>}
        <p style={{ fontSize: 12, opacity: 0.65 }}>To check a certificate code, use the <a href="/certificates">certificate check page</a>.</p>
      </>)}
    </main>
  );
}
