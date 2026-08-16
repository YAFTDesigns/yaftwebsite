'use client';

import { useEffect, useState, useCallback } from 'react';
import { getErrorMessage } from '@/lib/errorMessage';

type PageResult = {
  name: string;
  path: string;
  status: 'up' | 'down' | 'checking';
  code: number;
  ms: number;
};

type Queues = { enquiry: number; invoice: number };

export default function SiteStatus() {
  const [results, setResults]     = useState<PageResult[]>([]);
  const [allUp, setAllUp]         = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [queues, setQueues]       = useState<Queues>({ enquiry: 0, invoice: 0 });
  const [loading, setLoading]     = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/health', { cache: 'no-store' });
      const json = await res.json();
      setResults(json.results);
      setAllUp(json.allUp);
      setCheckedAt(json.checkedAt);
      setQueues(json.queues ?? { enquiry: 0, invoice: 0 });
    } catch {
      setAllUp(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- periodic health check against the site's own status endpoints, not a cascading-render bug
    check();
    const interval = setInterval(check, 60_000); // re-check every 60s
    return () => clearInterval(interval);
  }, [check]);

  const hasQueueBacklog = queues.enquiry > 0 || queues.invoice > 0;
  const overallColor = loading ? '#666' : !allUp ? '#e53935' : hasQueueBacklog ? '#e5a935' : '#4caf50';
  const overallLabel = loading
    ? 'Checking...'
    : !allUp
      ? 'Degraded — some pages down'
      : hasQueueBacklog
        ? 'Pages up — items queued for retry'
        : 'All systems operational';

  const [retrying, setRetrying]   = useState(false);
  const [retryMsg, setRetryMsg]   = useState('');

  async function runRetryNow() {
    setRetrying(true); setRetryMsg('');
    try {
      const res  = await fetch('/api/cron/retry-queue', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      const total = json.enquiries.processed + json.invoices.processed;
      const stillStuck = json.enquiries.requeued + json.invoices.requeued;
      setRetryMsg(
        stillStuck > 0
          ? `${total} recovered, ${stillStuck} still failing — check email alert`
          : total > 0
            ? `${total} recovered`
            : 'Nothing was queued'
      );
    } catch (e) {
      setRetryMsg(`Failed: ${getErrorMessage(e)}`);
    } finally {
      setRetrying(false);
      check();
    }
  }

  return (
    <div style={{
      background: 'var(--paper-2, #111)',
      border: `1px solid ${overallColor}33`,
      borderLeft: `3px solid ${overallColor}`,
      borderRadius: 6,
      padding: '14px 18px',
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: results.length ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: overallColor,
            display: 'inline-block',
            boxShadow: loading ? 'none' : `0 0 6px ${overallColor}`,
          }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: overallColor, letterSpacing: '0.08em' }}>
            {overallLabel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {checkedAt && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#444' }}>
              {new Date(checkedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={check} disabled={loading} style={{
            background: 'transparent', border: '1px solid #2a2a2a',
            color: '#555', borderRadius: 4, padding: '3px 10px',
            fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer',
            letterSpacing: '0.06em',
          }}>
            {loading ? '...' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {results.map(r => (
            <div key={r.path} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: r.status === 'up' ? '#4caf50' : '#e53935',
                display: 'inline-block', flexShrink: 0,
              }} />
              <a
                href={`https://www.yaftdesigns.com${r.path}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  color: r.status === 'up' ? '#666' : '#e53935',
                  textDecoration: 'none', letterSpacing: '0.04em',
                }}
              >
                {r.name}
              </a>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#333' }}>
                {r.ms}ms
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && (queues.enquiry > 0 || queues.invoice > 0) && (
        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a',
          display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#e5a935', display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#e5a935', letterSpacing: '0.04em' }}>
            {queues.invoice > 0 && `${queues.invoice} invoice${queues.invoice > 1 ? 's' : ''} queued for retry`}
            {queues.invoice > 0 && queues.enquiry > 0 && ' · '}
            {queues.enquiry > 0 && `${queues.enquiry} enquir${queues.enquiry > 1 ? 'ies' : 'y'} queued for retry`}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#555' }}>
            (auto-retries daily at 2am — a repeat failure sends an email alert)
          </span>
          <button onClick={runRetryNow} disabled={retrying} style={{
            background: 'transparent', border: '1px solid #e5a935',
            color: '#e5a935', borderRadius: 4, padding: '3px 10px',
            fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer',
            letterSpacing: '0.06em', opacity: retrying ? 0.6 : 1,
          }}>
            {retrying ? 'Running...' : 'Run retry now'}
          </button>
          {retryMsg && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#888' }}>{retryMsg}</span>
          )}
        </div>
      )}
    </div>
  );
}
