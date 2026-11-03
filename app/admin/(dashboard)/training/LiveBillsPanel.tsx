'use client';

import { card, chip, GREEN, heading, inr } from './panelStyles';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function LiveBillsPanel({ bills, courses, rules }: { bills: Json[] | null; courses: Json[]; rules: Json[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const batches = courses.map((c) => { const r = rules.find((x) => x.course_slug === c.slug); return r?.starts_on ? { title: c.title as string, batch: r.batch_label as string | undefined, starts: r.starts_on as string, ends: (r.ends_on as string) || '' } : null; }).filter(Boolean) as { title: string; batch?: string; starts: string; ends: string }[];
  const live = batches.filter((r) => r.starts <= today && (!r.ends || r.ends >= today));
  const next = batches.filter((r) => r.starts > today).sort((x, y) => x.starts.localeCompare(y.starts));
  const real = (bills ?? []).filter((b) => !b.test);
  const todays = real.filter((b) => b.paidAt && new Date(b.paidAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));

  return (
    <div style={{ maxWidth: 980 }}>
      <h3 style={{ ...heading, marginTop: 0 }}>Payment summary</h3>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0 }}>Every course payment as it comes in. Refreshes every 30 seconds, and each payment also emails yaftdesigns@gmail.com.</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: 8 }}>
        <div style={card}><div style={{ fontSize: 12, opacity: 0.6 }}>Paid today</div><div style={{ fontSize: 26, fontWeight: 700 }}>{todays.length}</div><div style={{ fontSize: 13, opacity: 0.7 }}>{inr(todays.reduce((a, b) => a + Number(b.amountInr), 0))}</div></div>
        <div style={card}><div style={{ fontSize: 12, opacity: 0.6 }}>Real payments, all time</div><div style={{ fontSize: 26, fontWeight: 700 }}>{real.length}</div><div style={{ fontSize: 13, opacity: 0.7 }}>{inr(real.reduce((a, b) => a + Number(b.amountInr), 0))}</div></div>
        <div style={card}><div style={{ fontSize: 12, opacity: 0.6 }}>Still to collect</div><div style={{ fontSize: 26, fontWeight: 700 }}>{inr([...new Map([...real].sort((x, y) => String(x.paidAt ?? '').localeCompare(String(y.paidAt ?? ''))).map((b) => [b.student + b.course, b])).values()].reduce((a, b) => a + Number(b.balanceInr), 0))}</div><div style={{ fontSize: 13, opacity: 0.7 }}>across students shown here</div></div>
      </div>

      <h3 style={heading}>Batches live now and coming up</h3>
      {!live.length && !next.length && <div style={{ ...card, opacity: 0.7 }}>No batch dates set yet. Add them under Courses & Batches.</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {live.map((r) => <div key={r.title + r.starts} style={{ ...card, marginBottom: 0, borderLeft: `3px solid ${GREEN}` }}><span style={chip(GREEN)}>LIVE</span><div style={{ fontWeight: 600, marginTop: 8 }}>{r.title}{r.batch ? ` (${r.batch})` : ''}</div><div style={{ fontSize: 12, opacity: 0.7 }}>{r.starts} to {r.ends || 'open'}</div></div>)}
        {next.map((r) => <div key={r.title + r.starts} style={{ ...card, marginBottom: 0, borderLeft: '3px solid var(--blueprint)' }}><span style={chip('var(--blueprint)')}>UPCOMING</span><div style={{ fontWeight: 600, marginTop: 8 }}>{r.title}{r.batch ? ` (${r.batch})` : ''}</div><div style={{ fontSize: 12, opacity: 0.7 }}>starts {r.starts}</div></div>)}
      </div>

      <h3 style={heading}>Payments</h3>
      {bills === null && <div style={{ ...card, opacity: 0.7 }}>Loading…</div>}
      {bills && bills.length === 0 && <div style={{ ...card, opacity: 0.7 }}>No course payments yet.</div>}
      {(bills ?? []).map((b) => {
        const pct = Number(b.courseTotalInr) > 0 ? Math.min(100, Math.round((Number(b.paidSoFarInr) / Number(b.courseTotalInr)) * 100)) : 0;
        const full = Number(b.balanceInr) <= 0;
        return (
          <div key={b.id} style={{ ...card, borderLeft: `3px solid ${full ? GREEN : 'var(--brass)'}` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 220, flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{b.student}{b.test && <span style={{ ...chip('var(--brass)'), marginLeft: 8 }}>TEST</span>}</div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{b.email}{b.phone ? ` · ${b.phone}` : ''}</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>{b.course}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{inr(b.amountInr)}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{b.kind} · {b.paidAt ? new Date(b.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: full ? GREEN : 'var(--blueprint)' }} /></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, fontSize: 13, marginTop: 8 }}>
                <span>Paid so far {inr(b.paidSoFarInr)} of {inr(b.courseTotalInr)}</span>
                <span style={{ color: full ? GREEN : 'var(--brass)', fontWeight: 600 }}>{full ? 'Fully paid' : `${inr(b.balanceInr)} left`}</span>
                <span style={{ opacity: 0.7 }}>Bill {b.invoiceNo ?? '-'}{b.syncStatus !== 'ok' && <span style={{ color: 'var(--brass)' }}> · bill step: {b.syncStatus}</span>}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
