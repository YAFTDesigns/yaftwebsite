"use client";
import { useEffect, useState, type ReactNode } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

function GoogleG() { return (<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ marginRight: 10, verticalAlign: 'middle' }}><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.600 5.900c4.500-4.200 7-10.300 7-17.600z"/><path fill="#FBBC05" d="M10.500 28.700c-.5-1.400-.8-3-.8-4.700s.3-3.300.8-4.700l-7.900-6.100C.9 16.500 0 20.100 0 24s.9 7.500 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>); }

// Step 1 of enrolling: register (sign in) first. Signed-in students go straight to choosing a course.
// This is a convenience step only: the payment routes themselves are unchanged.
export default function EnrollGate({ course, children }: { course?: string; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [news, setNews] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let live = true;
    const failed = new URLSearchParams(window.location.search).get('auth') === 'failed';
    const out = () => { if (live) { setState('out'); if (failed) setMsg('Sign-in did not complete. Please try again.'); } };
    fetch('/api/student/me', { cache: 'no-store' }).then((r) => {
      if (!live) return;
      if (!r.ok) { out(); return; }
      setState('in');
      try { // apply the choices made on the register card, once, now that the account exists
        if (localStorage.getItem('yaft_marketing_pref') === '1') { localStorage.removeItem('yaft_marketing_pref'); fetch('/api/student/marketing-consent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ on: true }) }).catch(() => {}); }
      } catch { /* storage unavailable */ }
    }).catch(out);
    return () => { live = false; };
  }, []);

  function rememberChoices() { try { localStorage.setItem('yaft_interest_pref', '1'); if (news) localStorage.setItem('yaft_marketing_pref', '1'); else localStorage.removeItem('yaft_marketing_pref'); } catch { /* ignore */ } }
  const redirectTo = () => `${window.location.origin}/auth/callback?next=/enroll${course && /^[a-z0-9-]{1,80}$/.test(course) ? `&course=${course}` : ''}`;
  async function google() { await getSupabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } } }); }
  async function emailLink() {
    setBusy(true); setMsg(''); rememberChoices();
    const { error } = await getSupabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg('Could not send the link. Check the address and try again.'); else setSent(true);
  }

  if (state === 'in') return <>{children}</>;
  if (state === 'loading') return <p className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Checking your account...</p>;
  return (
    <section className="eg-card">
      <style>{`.eg-card{position:relative;overflow:hidden;isolation:isolate;max-width:480px;margin-top:8px;padding:28px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.03));box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(255,255,255,.05)}
.eg-card:before{content:"";position:absolute;inset:-40% auto auto -20%;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(64,224,208,.22),transparent 70%);z-index:-1;pointer-events:none}
.eg-card:after{content:"";position:absolute;z-index:-1;right:-40px;top:-30px;width:340px;height:250px;background:url(/assets/logos/rhino-icon-flipped.png) no-repeat right bottom/contain;opacity:.12;pointer-events:none}
@supports ((backdrop-filter:blur(12px)) or (-webkit-backdrop-filter:blur(12px))){.eg-card{backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%)}}
.eg-card .btn-secondary{border-radius:10px}.eg-card .field{border-radius:10px;background:rgba(0,0,0,.35)}`}</style>
      <div className="eyebrow" style={{ marginBottom: 10 }}>STEP 1 OF 2</div>
      <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Register to enrol</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '0 0 16px' }}>Create your student account first. After that you pick your course and pay. Your bills and certificate will be waiting in your student portal.</p>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}
      <label style={{ fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 16 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
        <span>I agree to the <a href="/terms" target="_blank" rel="noopener" style={{ color: 'var(--blueprint)' }}>Terms</a> and <a href="/privacy" target="_blank" rel="noopener" style={{ color: 'var(--blueprint)' }}>Privacy Policy</a>. <span style={{ opacity: 0.6 }}>(required)</span></span>
      </label>
      <label style={{ fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', margin: '-4px 0 16px' }}>
        <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} style={{ marginTop: 3 }} />
        <span>Keep me posted with the latest newsletter, batches and updates by email. <span style={{ opacity: 0.6 }}>(optional, stop any time)</span></span>
      </label>
      <button className="btn-secondary" style={{ width: '100%', background: '#fff', color: '#1f1f1f', opacity: agree ? 1 : 0.45, cursor: agree ? 'pointer' : 'not-allowed' }} disabled={!agree} onClick={() => { rememberChoices(); google(); }}><GoogleG />Continue with Google</button>
      {sent ? <p style={{ fontSize: 14, marginTop: 14 }}>Check your inbox. We sent a sign-in link to {email}.</p> : <>
        <input className="field" type="email" placeholder="Or use your email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: 12, width: '100%' }} />
        <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} disabled={!agree || busy || !email.includes('@')} onClick={emailLink}>{busy ? 'Sending...' : 'Email me a sign-in link'}</button>
      </>}
      <p style={{ fontSize: 12, opacity: 0.65, marginTop: 14 }}>Already registered? Sign in the same way and you go straight to choosing your course.</p>
    </section>
  );
}
