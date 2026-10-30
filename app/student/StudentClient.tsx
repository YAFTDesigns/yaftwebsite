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
  enrolments: Card[]; candidates: { planId: string; title: string; createdAt: string }[]; totals: { courses: number; outstandingInr: number };
};

const TABS = ['My Courses', 'Payments & Bills', 'My Projects', 'Certificates & Verification'] as const;
const box = { border: '1px solid var(--line)', background: 'var(--paper)', padding: 16, marginBottom: 14 } as const;
const input = { background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '9px 10px', fontSize: 14, width: '100%' } as const;
const btn = { background: 'var(--ink)', color: 'var(--paper)', border: '1px solid var(--ink)', padding: '9px 14px', fontSize: 14, cursor: 'pointer' } as const;
const ghost = { ...btn, background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' } as const;
const badge = (c: string) => ({ display: 'inline-block', fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 8px', border: `1px solid ${c}`, color: c }) as const;
const STATUS: Record<Card['payStatus'], [string, string]> = { unpaid: ['Not paid yet', '#ffb300'], advance_paid: ['Advance paid', '#4c8bf5'], paid_in_full: ['Paid in full', '#4caf50'], cancelled: ['Cancelled', '#999'] };
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
  async function saveProfile() {
    const { ok, j } = await post('/api/student/profile', profile, 'PATCH');
    setMsg(ok ? 'Saved.' : j.error ?? 'Could not save.'); if (ok) { setShowProfile(false); load(); }
  }

  const wrap = { maxWidth: 860, margin: '0 auto', padding: '64px 20px', color: 'var(--ink)' } as const;
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
  const certsReady: number = 0;
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
        <button style={ghost} onClick={() => setShowProfile((v) => !v)}>Profile</button>
        <button style={ghost} onClick={signOut}>Sign out</button>
      </div>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}

      {showProfile && (
        <div style={box}>
          <label style={{ fontSize: 12 }}>Display name<input style={input} value={profile.displayName} maxLength={80} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label>
          <label style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Name on certificate (kept separate from your display name)<input style={input} value={profile.certificateName} maxLength={80} onChange={(e) => setProfile({ ...profile, certificateName: e.target.value })} /></label>
          <label style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Phone (optional)<input style={input} value={profile.phone} maxLength={20} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          <p style={{ fontSize: 12, opacity: 0.65, margin: '8px 0' }}>Signed in as {me.profile.email}. Changing your sign-in email never moves your enrolments.</p>
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

      {(tab === 'My Projects' || tab === 'Certificates & Verification') && (
        <div style={box}>This section is being built and is not active yet.</div>
      )}
    </main>
  );
}
