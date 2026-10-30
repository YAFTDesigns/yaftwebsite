'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';
import { fmtFixed2 } from '@/lib/format';

type Course = { slug: string; title: string; fee_inr: number | null; checkout_enabled: boolean; active: boolean };
type Bundle = { id: string; slug: string; title: string; description: string | null; course_slugs: string[]; fee_inr: number; active: boolean };

const field = { background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 10px', fontSize: 14 } as const;
const btn = { ...field, cursor: 'pointer', marginRight: 6 } as const;
const h2 = { fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', margin: '28px 0 10px' } as const;

export default function CourseFeesClient() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [fx, setFx] = useState<{ inr_per_usd: number; source: string; fetched_at: string } | null>(null);
  const [on, setOn] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0);
  const [nb, setNb] = useState({ slug: '', title: '', description: '', fee_inr: '', course_slugs: [] as string[] });

  useEffect(() => {
    let live = true;
    fetch('/api/admin/course-fees').then((r) => r.json()).then((j) => { if (!live) return; setCourses(j.courses ?? []); setBundles(j.bundles ?? []); setFx(j.fx ?? null); setOn(!!j.checkoutOn); }).catch(() => { if (live) setMsg('Could not load'); });
    return () => { live = false; };
  }, [tick]);

  async function send(method: string, body: unknown) {
    const res = await fetch('/api/admin/course-fees', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? 'Saved.' : j.error ?? 'Could not save');
    if (res.ok) setTick((t) => t + 1);
    return res.ok;
  }
  const feeOf = (c: Course) => edits[c.slug] ?? (c.fee_inr === null ? '' : String(c.fee_inr));
  const gst = (n: number) => `GST ₹${fmtFixed2(n * 0.18)}, total ₹${fmtFixed2(n * 1.18)}`;

  return (
    <>
      <h1 className={styles.sectionTitle}>Course fees and combos</h1>
      <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>Enter each fee in rupees <strong>before GST</strong>. A course is shown on the site and in checkout only when it has a fee and &ldquo;On sale&rdquo; is ticked. Changing a fee affects new checkouts only.</p>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 12, color: on ? '#4caf50' : '#ffb300' }}>Online checkout is {on ? 'ON' : 'OFF (COURSE_CHECKOUT_ENABLED is not set to 1 in Vercel)'}.</p>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 12 }}>Live USD rate: {fx ? `₹${Number(fx.inr_per_usd).toFixed(2)} per US$ (${fx.source}, ${new Date(fx.fetched_at).toLocaleString('en-IN')})` : 'not fetched yet, it is fetched the first time someone opens checkout'}. USD prices are INR fee divided by this rate, plus a small buffer, rounded up to a whole dollar.</p>
      {msg && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{msg}</p>}

      <h2 style={h2}>Courses</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead><tr><th>Course</th><th>Fee (₹, before GST)</th><th>With GST</th><th>On sale</th><th></th></tr></thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.slug}>
                <td>{c.title}<div style={{ opacity: 0.5, fontSize: 11 }}>{c.slug}</div></td>
                <td><input style={{ ...field, width: 120 }} type="number" min={1} step={1} value={feeOf(c)} onChange={(e) => setEdits((x) => ({ ...x, [c.slug]: e.target.value }))} /></td>
                <td style={{ fontSize: 12 }}>{Number(feeOf(c)) > 0 ? gst(Number(feeOf(c))) : '—'}</td>
                <td><input type="checkbox" checked={c.checkout_enabled} disabled={!c.fee_inr && !(Number(feeOf(c)) > 0)} onChange={(e) => send('PATCH', { kind: 'course', slug: c.slug, fee_inr: feeOf(c) === '' ? null : Number(feeOf(c)), checkout_enabled: e.target.checked })} /></td>
                <td><button style={btn} onClick={() => send('PATCH', { kind: 'course', slug: c.slug, fee_inr: feeOf(c) === '' ? null : Number(feeOf(c)), checkout_enabled: c.checkout_enabled })}>Save fee</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Combos (e.g. Rhino + Grasshopper)</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead><tr><th>Combo</th><th>Courses</th><th>Fee (₹, before GST)</th><th>Active</th></tr></thead>
          <tbody>
            {bundles.map((b) => (
              <tr key={b.id}>
                <td>{b.title}<div style={{ opacity: 0.5, fontSize: 11 }}>{b.slug}</div></td>
                <td style={{ fontSize: 12 }}>{b.course_slugs.join(', ')}</td>
                <td><input style={{ ...field, width: 120 }} type="number" min={1} step={1} value={edits[b.id] ?? String(b.fee_inr)} onChange={(e) => setEdits((x) => ({ ...x, [b.id]: e.target.value }))} /><button style={{ ...btn, marginLeft: 6 }} onClick={() => send('PATCH', { kind: 'bundle', id: b.id, fee_inr: Number(edits[b.id] ?? b.fee_inr) })}>Save</button><div style={{ fontSize: 12, opacity: 0.7 }}>{gst(Number(edits[b.id] ?? b.fee_inr))}</div></td>
                <td><input type="checkbox" checked={b.active} onChange={(e) => send('PATCH', { kind: 'bundle', id: b.id, active: e.target.checked })} /></td>
              </tr>
            ))}
            {bundles.length === 0 && <tr><td colSpan={4}>No combos yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>New combo</h2>
      <div style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <input style={field} placeholder="Title, e.g. Rhino + Grasshopper for Architecture" value={nb.title} onChange={(e) => setNb({ ...nb, title: e.target.value })} />
        <input style={field} placeholder="Slug, e.g. rhino-grasshopper-combo" value={nb.slug} onChange={(e) => setNb({ ...nb, slug: e.target.value.toLowerCase() })} />
        <input style={field} placeholder="Short description (optional)" value={nb.description} onChange={(e) => setNb({ ...nb, description: e.target.value })} />
        <input style={field} type="number" min={1} step={1} placeholder="Combo fee in rupees, before GST" value={nb.fee_inr} onChange={(e) => setNb({ ...nb, fee_inr: e.target.value })} />
        <div style={{ fontSize: 13 }}>Courses in the combo (pick at least two):
          {courses.map((c) => (
            <label key={c.slug} style={{ display: 'block', marginTop: 4 }}>
              <input type="checkbox" checked={nb.course_slugs.includes(c.slug)} onChange={(e) => setNb({ ...nb, course_slugs: e.target.checked ? [...nb.course_slugs, c.slug] : nb.course_slugs.filter((s) => s !== c.slug) })} /> {c.title}
            </label>
          ))}
        </div>
        <button style={btn} onClick={async () => { if (await send('POST', { ...nb, fee_inr: Number(nb.fee_inr) })) setNb({ slug: '', title: '', description: '', fee_inr: '', course_slugs: [] }); }}>Create combo</button>
        <p style={{ fontSize: 12, opacity: 0.7 }}>A combo is offered at checkout only while every course inside it is also on sale.</p>
      </div>
    </>
  );
}
