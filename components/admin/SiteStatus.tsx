'use client';

import { useEffect, useState, useCallback } from 'react';

type PageResult = {
  name: string;
  path: string;
  status: 'up' | 'down' | 'checking';
  code: number;
  ms: number;
};

export default function SiteStatus() {
  const [results, setResults]     = useState<PageResult[]>([]);
  const [allUp, setAllUp]         = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/health', { cache: 'no-store' });
      const json = await res.json();
      setResults(json.results);
      setAllUp(json.allUp);
      setCheckedAt(json.checkedAt);
    } catch {
      setAllUp(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 60_000); // re-check every 60s
    return () => clearInterval(interval);
  }, [check]);

  const overallColor = loading ? '#666' : allUp ? '#4caf50' : '#e53935';
  const overallLabel = loading ? 'Checking...' : allUp ? 'All systems operational' : 'Degraded — some pages down';

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
                href={`https://yaftdesigns.com${r.path}`}
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
    </div>
  );
}
