'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/(dashboard)/admin.module.css';

type Hit = { kind: string; title: string; subtitle: string; href: string };
const actions: Hit[] = [
  { kind: 'Action', title: 'Today command centre', subtitle: 'Open today’s operational queues', href: '/admin/today' },
  { kind: 'Action', title: 'Create invoice', subtitle: 'Open invoices', href: '/admin/invoices' },
  { kind: 'Action', title: 'Students & payments', subtitle: 'Open training operations', href: '/admin/training' },
  { kind: 'Action', title: 'Lead pipeline', subtitle: 'Open sales leads', href: '/admin/leads' },
  { kind: 'Action', title: 'Email health', subtitle: 'Review sent and failed email', href: '/admin/emails' },
];

export default function AdminCommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); setLoading(false); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/search?q=${encodeURIComponent(t)}`, { cache: 'no-store', signal: ctrl.signal });
        const j = r.ok ? await r.json() : { results: [] };
        setHits(j.results ?? []);
      } catch { if (!ctrl.signal.aborted) setHits([]); }
      finally { if (!ctrl.signal.aborted) setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [q]);

  const shown = useMemo(() => q.trim().length < 2 ? actions : hits, [q, hits]);
  const go = (href: string) => { setOpen(false); setQ(''); router.push(href); };

  return <>
    <button type="button" className={styles.commandTrigger} onClick={() => setOpen(true)} aria-label="Search admin">
      Search <span>Ctrl K</span>
    </button>
    {open && <div className={styles.commandBackdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className={styles.commandPanel} role="dialog" aria-modal="true" aria-label="Admin search">
        <input ref={inputRef} className={styles.commandInput} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students, leads, invoices, certificates…" />
        <div className={styles.commandResults}>
          {loading && <div className={styles.commandEmpty}>Searching…</div>}
          {!loading && !shown.length && <div className={styles.commandEmpty}>No matches.</div>}
          {!loading && shown.map((x, i) => <button key={x.href + x.title + i} type="button" className={styles.commandResult} onClick={() => go(x.href)}>
            <span className={styles.commandKind}>{x.kind}</span>
            <span><strong>{x.title}</strong><small>{x.subtitle}</small></span>
          </button>)}
        </div>
        <div className={styles.commandFooter}>Esc to close · type 2+ characters to search</div>
      </div>
    </div>}
  </>;
}
