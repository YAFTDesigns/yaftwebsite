'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import styles from './login.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'password' | 'magic-link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message);
      setStatus('error');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the magic link.');
      setStatus('error');
    }
  }

  return (
    <main className={styles.wrap}>
      <form className={styles.card} onSubmit={mode === 'password' ? handlePasswordSubmit : handleMagicLinkSubmit}>
        <div className="eyebrow">ADMIN</div>
        <h1>Sign in</h1>
        <p className={styles.lede}>
          {mode === 'password'
            ? 'Sign in with your admin email and password.'
            : "Enter your admin email — we'll send a magic link to sign in, no password needed."}
        </p>

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yaftdesigns.com"
            required
            disabled={status === 'sending' || status === 'sent'}
          />
        </div>

        {mode === 'password' && (
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={status === 'sending'}
            />
          </div>
        )}

        {status === 'error' && <p className={styles.error}>{error}</p>}
        {status === 'sent' && <p className={styles.success}>Check your inbox for the sign-in link.</p>}

        <button type="submit" className="btn-primary" disabled={status === 'sending' || status === 'sent'}>
          {status === 'sending'
            ? mode === 'password' ? 'Signing in…' : 'Sending…'
            : mode === 'password' ? 'Sign in' : 'Send magic link'}
        </button>

        <button
          type="button"
          className={styles.switchMode}
          onClick={() => {
            setMode(mode === 'password' ? 'magic-link' : 'password');
            setStatus('idle');
            setError('');
          }}
        >
          {mode === 'password' ? 'Use a magic link instead' : 'Use a password instead'}
        </button>
      </form>
    </main>
  );
}
