"use client";
import { useEffect, useState, type ReactNode } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

// Step 1 of enrolling: register (sign in) first. Signed-in students go straight to choosing a course.
// This is a convenience step only: the payment routes themselves are unchanged.
export default function EnrollGate({ course, children }: { course?: string; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let live = true;
    const failed = new URLSearchParams(window.location.search).get('auth') === 'failed';
    const out = () => { if (live) { setState('out'); if (failed) setMsg('Sign-in did not complete. Please try again.'); } };
    fetch('/api/student/me', { cache: 'no-store' }).then((r) => { if (!live) return; if (r.ok) setState('in'); else out(); }).catch(out);
    return () => { live = false; };
  }, []);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=/enroll${course && /^[a-z0-9-]{1,80}$/.test(course) ? `&course=${course}` : ''}`;
  async function google() { await getSupabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } } }); }
  async function emailLink() {
    setBusy(true); setMsg('');
    const { error } = await getSupabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg('Could not send the link. Check the address and try again.'); else setSent(true);
    try { localStorage.setItem('yaft_interest_pref', '1'); } catch { /* ignore */ }
  }

  if (state === 'in') return <>{children}</>;
  if (state === 'loading') return <p className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Checking your account...</p>;
  return (
    <section style={{ maxWidth: 480, border: '1px solid var(--line)', background: 'var(--paper-2)', padding: 24, marginTop: 8 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>STEP 1 OF 2</div>
      <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Register to enrol</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '0 0 16px' }}>Create your student account first. After that you pick your course and pay. Your bills and certificate will be waiting in your student portal.</p>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}
      <label style={{ fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 16 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
        <span>I agree to the <a href="/terms" target="_blank" rel="noopener" style={{ color: 'var(--blueprint)' }}>Terms</a> and <a href="/privacy" target="_blank" rel="noopener" style={{ color: 'var(--blueprint)' }}>Privacy Policy</a>. <span style={{ opacity: 0.6 }}>(required)</span></span>
      </label>
      <button className="btn-secondary" style={{ width: '100%', background: '#fff', color: '#1f1f1f', opacity: agree ? 1 : 0.45, cursor: agree ? 'pointer' : 'not-allowed' }} disabled={!agree} onClick={() => { try { localStorage.setItem('yaft_interest_pref', '1'); } catch { /* ignore */ } google(); }}>Continue with Google</button>
      {sent ? <p style={{ fontSize: 14, marginTop: 14 }}>Check your inbox. We sent a sign-in link to {email}.</p> : <>
        <input className="field" type="email" placeholder="Or use your email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: 12, width: '100%' }} />
        <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} disabled={!agree || busy || !email.includes('@')} onClick={emailLink}>{busy ? 'Sending...' : 'Email me a sign-in link'}</button>
      </>}
      <p style={{ fontSize: 12, opacity: 0.65, marginTop: 14 }}>Already registered? Sign in the same way and you go straight to choosing your course.</p>
    </section>
  );
}
