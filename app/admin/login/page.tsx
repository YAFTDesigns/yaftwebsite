'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import styles from './login.module.css';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
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
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className="eyebrow">ADMIN</div>
        <h1>Sign in</h1>
        <p className={styles.lede}>Enter your admin email — we&apos;ll send a magic link to sign in, no password needed.</p>

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

        {status === 'error' && <p className={styles.error}>{error}</p>}
        {status === 'sent' && <p className={styles.success}>Check your inbox for the sign-in link.</p>}

        <button type="submit" className="btn-primary" disabled={status === 'sending' || status === 'sent'}>
          {status === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
    </main>
  );
}
