'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from '../admin.module.css';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const field = { background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 9px', fontSize: 13 } as const;
const btn = { ...field, cursor: 'pointer', marginRight: 6 } as const;
const h2 = { fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', margin: '24px 0 10px' } as const;
const TABS = ['Students & Enrolments', 'Courses & Batches', 'Project Reviews', 'Certificates', 'Testimonials', 'Audit log'] as const;

export default function TrainingClient() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Students & Enrolments');
  const [d, setD] = useState<Json>({});
  const [projects, setProjects] = useState<Json[]>([]);
  const [msg, setMsg] = useState('');
  const [fb, setFb] = useState<Record<string, string>>({});
  const [rule, setRule] = useState<Record<string, Json>>({});

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch('/api/admin/training'), fetch('/api/admin/student-projects')]);
    if (a.ok) setD(await a.json());
    if (b.ok) setProjects((await b.json()).data ?? []);
  }, []);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); }, [load]);

  async function act(url: string, body: Json) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (j.result?.status === 'needs_setup' || j.result?.status === 'not_eligible' ? `Not issued: ${(j.result.missing ?? []).join(', ')}` : 'Done.') : j.error ?? 'Failed');
    load();
  }
  const post = (body: Json) => act('/api/admin/training', body);
  const rules: Json[] = d.rules ?? [];
  const ruleOf = (slug: string): Json => ({ requires_full_payment: true, ...rules.find((r) => r.course_slug === slug), ...rule[slug] });
  const setR = (slug: string, k: string, v: unknown) => setRule((x) => ({ ...x, [slug]: { ...ruleOf(slug), ...x[slug], [k]: v } }));

  return (
    <>
      <h1 className={styles.sectionTitle}>Training: students, projects, certificates</h1>
      <div style={{ marginBottom: 14 }}>{TABS.map((t) => <button key={t} style={{ ...btn, background: tab === t ? 'var(--ink)' : 'var(--paper)', color: tab === t ? 'var(--paper)' : 'var(--ink)' }} onClick={() => setTab(t)}>{t}</button>)}</div>
      {msg && <p style={{ color: 'var(--brass)' }}>{msg}</p>}

      {tab === 'Students & Enrolments' && (<>
        <h2 style={h2}>Linking requests that need a person ({(d.claims ?? []).length})</h2>
        <table className={styles.table}><thead><tr><th>When</th><th>Note</th><th></th></tr></thead><tbody>
          {(d.claims ?? []).map((c: Json) => <tr key={c.id}><td>{new Date(c.created_at).toLocaleString('en-IN')}</td><td>{c.note}</td><td>
            <button style={btn} disabled={!c.plan_id} onClick={() => post({ action: 'resolve_claim', reviewId: c.id, decision: 'approved' })}>Link it</button>
            <button style={btn} onClick={() => post({ action: 'resolve_claim', reviewId: c.id, decision: 'rejected' })}>Reject</button></td></tr>)}
          {!(d.claims ?? []).length && <tr><td colSpan={3}>Nothing waiting.</td></tr>}
        </tbody></table>
        <h2 style={h2}>Students ({(d.students ?? []).length})</h2>
        <table className={styles.table}><thead><tr><th>Name</th><th>Certificate name</th><th>Enrolments</th><th>Joined</th></tr></thead><tbody>
          {(d.students ?? []).map((s: Json) => {
            const mine = (d.links ?? []).filter((l: Json) => l.student_id === s.id);
            return <tr key={s.id}><td>{s.display_name ?? '-'}</td><td>{s.certificate_name ?? '-'}</td><td>{mine.map((l: Json) => <div key={l.plan_id} style={{ fontSize: 12 }}>{l.course_payment_plans?.description} ({l.linked_via})</div>)}</td><td>{new Date(s.created_at).toLocaleDateString('en-IN')}</td></tr>;
          })}
        </tbody></table>
      </>)}

      {tab === 'Courses & Batches' && (<>
        <p style={{ fontSize: 13, opacity: 0.75 }}>Fees and combos are on the <a href="/admin/course-fees" style={{ textDecoration: 'underline' }}>Course fees</a> page. Here: batch dates, balance due date, certificate rules and the certificate print details. Certificates for a course are held back until its print details are filled in.</p>
        <div style={{ overflowX: 'auto' }}><table className={styles.table}><thead><tr><th>Course</th><th>Batch</th><th>Starts</th><th>Ends</th><th>Balance due</th><th>Full payment for certificate</th><th>Print: product</th><th>Suffix</th><th>Hours</th><th></th></tr></thead><tbody>
          {(d.courses ?? []).map((c: Json) => { const r = ruleOf(c.slug); return (
            <tr key={c.slug}><td>{c.title}</td>
              <td><input style={{ ...field, width: 100 }} value={r.batch_label ?? ''} onChange={(e) => setR(c.slug, 'batch_label', e.target.value)} /></td>
              <td><input style={field} type="date" value={r.starts_on ?? ''} onChange={(e) => setR(c.slug, 'starts_on', e.target.value)} /></td>
              <td><input style={field} type="date" value={r.ends_on ?? ''} onChange={(e) => setR(c.slug, 'ends_on', e.target.value)} /></td>
              <td><input style={field} type="date" value={r.balance_due_on ?? ''} onChange={(e) => setR(c.slug, 'balance_due_on', e.target.value)} /></td>
              <td><input type="checkbox" checked={r.requires_full_payment !== false} onChange={(e) => setR(c.slug, 'requires_full_payment', e.target.checked)} /></td>
              <td><select style={field} value={r.cert_key ?? ''} onChange={(e) => setR(c.slug, 'cert_key', e.target.value)}><option value="">-</option><option value="rhino">Rhinoceros 3D</option><option value="grasshopper">Grasshopper</option><option value="default">Plain</option></select></td>
              <td><input style={{ ...field, width: 150 }} placeholder="FOR ARCHITECTURE" value={r.cert_suffix ?? ''} onChange={(e) => setR(c.slug, 'cert_suffix', e.target.value)} /></td>
              <td><input style={{ ...field, width: 50 }} value={r.cert_hours ?? ''} onChange={(e) => setR(c.slug, 'cert_hours', e.target.value)} /></td>
              <td><button style={btn} onClick={() => post({ action: 'set_rule', slug: c.slug, ...r })}>Save</button></td></tr>); })}
        </tbody></table></div>
      </>)}

      {tab === 'Project Reviews' && (<>
        {!projects.length && <p>No projects waiting.</p>}
        {projects.map((p) => (
          <div key={p.id} style={{ border: '1px solid var(--line)', padding: 14, marginBottom: 12 }}>
            <strong>{p.title}</strong> <span style={{ opacity: 0.6 }}>v{p.rev_no} · {p.status} · {p.student_projects?.publish_consent ? `may publish as "${p.student_projects.public_display_name}"` : 'private (no publish consent)'}</span>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{p.description}</p>
            <div style={{ fontSize: 12 }}>{(p.links ?? []).map((l: string) => <div key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow">{l}</a></div>)}
              {[p.cover_path, ...(p.gallery_paths ?? [])].filter(Boolean).map((x: string) => <a key={x} style={{ marginRight: 10 }} href={`/api/admin/student-projects/asset?path=${encodeURIComponent(x)}`} target="_blank" rel="noreferrer">image</a>)}
              {(p.private_files ?? []).map((f: Json) => <a key={f.path} style={{ marginRight: 10 }} href={`/api/admin/student-projects/asset?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer">{f.name} (private)</a>)}</div>
            <textarea style={{ ...field, width: '100%', minHeight: 60, marginTop: 8 }} placeholder="Feedback for the student (required when asking for changes)" value={fb[p.id] ?? ''} onChange={(e) => setFb({ ...fb, [p.id]: e.target.value })} />
            <div style={{ marginTop: 6 }}>
              {(['approved', 'changes_requested', 'under_review'] as const).map((dec) => <button key={dec} style={btn} onClick={() => act('/api/admin/student-projects', { revisionId: p.id, decision: dec, feedback: fb[p.id] ?? '' })}>{dec === 'approved' ? 'Approve' : dec === 'changes_requested' ? 'Request changes' : 'Mark under review'}</button>)}
            </div>
          </div>))}
      </>)}

      {tab === 'Certificates' && (
        <div style={{ overflowX: 'auto' }}><table className={styles.table}><thead><tr><th>ID</th><th>Name</th><th>Course</th><th>Date</th><th>By</th><th>Status</th><th></th></tr></thead><tbody>
          {(d.certificates ?? []).map((c: Json) => <tr key={c.id}><td>{c.certificate_id}</td><td>{c.student_name}</td><td>{c.course_suffix}</td><td>{c.issue_date}</td><td>{c.issued_by ?? 'admin (old)'}</td><td>{c.revoked ? `Revoked: ${c.revoked_reason ?? ''}` : 'Valid'}</td><td>
            {!c.revoked && <button style={btn} onClick={() => { const reason = window.prompt('Reason for revoking?'); if (reason) post({ action: 'cert_revoke', id: c.id, reason }); }}>Revoke</button>}
            {!c.revoked && c.plan_id && <button style={btn} onClick={() => window.confirm('Revoke this and issue a corrected one from the student\'s current certificate name?') && post({ action: 'cert_reissue', id: c.id })}>Reissue</button>}</td></tr>)}
        </tbody></table></div>
      )}

      {tab === 'Testimonials' && (<>
        <p style={{ fontSize: 12, opacity: 0.7 }}>Student testimonials waiting for review, and live ones. Old website-form testimonials stay on the Testimonials page.</p>
        {(d.testimonials ?? []).map((t: Json) => (
          <div key={t.id} style={{ border: '1px solid var(--line)', padding: 14, marginBottom: 12 }}>
            <strong>{t.public_display_name}</strong> <span style={{ opacity: 0.6 }}>{t.status} · photo: {t.photo}{t.photo_consent_at ? '' : ' (no consent)'}</span>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{t.quote}</p>
            {t.status === 'submitted' && <><input style={{ ...field, width: '100%' }} placeholder="Note to the student (needed to request changes)" value={fb[t.id] ?? ''} onChange={(e) => setFb({ ...fb, [t.id]: e.target.value })} />
              <div style={{ marginTop: 6 }}><button style={btn} onClick={() => post({ action: 'testimonial_approve', id: t.id })}>Approve and publish</button><button style={btn} onClick={() => post({ action: 'testimonial_changes', id: t.id, feedback: fb[t.id] })}>Request changes</button></div></>}
            {t.status === 'approved' && <button style={btn} onClick={() => window.confirm('Take this off the website?') && post({ action: 'testimonial_remove', id: t.id })}>Remove from website</button>}
          </div>))}
        {!(d.testimonials ?? []).length && <p>None yet.</p>}
      </>)}

      {tab === 'Audit log' && (
        <table className={styles.table}><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Subject</th></tr></thead><tbody>
          {(d.audit ?? []).map((e: Json) => <tr key={e.id}><td>{new Date(e.created_at).toLocaleString('en-IN')}</td><td>{e.actor_type} {e.actor_ref ?? ''}</td><td>{e.action}</td><td style={{ fontSize: 11 }}>{e.subject}</td></tr>)}
        </tbody></table>
      )}
    </>
  );
}
