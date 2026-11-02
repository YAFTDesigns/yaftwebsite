'use client';

import { useState } from 'react';
import { card, chip, ghost, GREEN, input, label, primary } from './panelStyles';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const wrap = { maxWidth: 980 } as const;
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function CoursesBatchesPanel({ d, post }: { d: Json; post: (b: Json) => void }) {
  const [edits, setEdits] = useState<Record<string, Json>>({});
  const rules: Json[] = d.rules ?? [];
  const ruleOf = (slug: string): Json => ({ requires_full_payment: true, ...rules.find((r) => r.course_slug === slug), ...edits[slug] });
  const set = (slug: string, k: string, v: unknown) => setEdits((x) => ({ ...x, [slug]: { ...x[slug], [k]: v } }));
  return (
    <div style={wrap}>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 0 }}>Fees and combos are on the <a href="/admin/course-fees" style={{ textDecoration: 'underline' }}>Course fees</a> page. Here: batch dates, balance due date, certificate rules and the print details. A course&apos;s certificates are held back until its print details are filled in.</p>
      {(d.courses ?? []).map((c: Json) => {
        const r = ruleOf(c.slug);
        const ready = !!(r.cert_key && r.cert_suffix && r.cert_hours);
        return (
          <div key={c.slug} style={{ ...card, borderLeft: `3px solid ${ready ? GREEN : 'var(--brass)'}` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
              <strong style={{ fontSize: 17 }}>{c.title}</strong>
              <span style={chip(ready ? GREEN : 'var(--brass)')}>{ready ? 'Certificate ready' : 'Print details missing'}</span>
            </div>
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
              <div><label style={label}>Batch</label><input style={input} value={r.batch_label ?? ''} onChange={(e) => set(c.slug, 'batch_label', e.target.value)} /></div>
              <div><label style={label}>Starts</label><input style={input} type="date" value={r.starts_on ?? ''} onChange={(e) => set(c.slug, 'starts_on', e.target.value)} /></div>
              <div><label style={label}>Ends</label><input style={input} type="date" value={r.ends_on ?? ''} onChange={(e) => set(c.slug, 'ends_on', e.target.value)} /></div>
              <div><label style={label}>Balance due</label><input style={input} type="date" value={r.balance_due_on ?? ''} onChange={(e) => set(c.slug, 'balance_due_on', e.target.value)} /></div>
              <div><label style={label}>Certificate product</label><select style={input} value={r.cert_key ?? ''} onChange={(e) => set(c.slug, 'cert_key', e.target.value)}><option value="">Choose</option><option value="rhino">Rhinoceros 3D</option><option value="grasshopper">Grasshopper</option><option value="default">Plain</option></select></div>
              <div><label style={label}>Suffix</label><input style={input} placeholder="FOR ARCHITECTURE" value={r.cert_suffix ?? ''} onChange={(e) => set(c.slug, 'cert_suffix', e.target.value)} /></div>
              <div><label style={label}>Hours</label><input style={input} inputMode="numeric" value={r.cert_hours ?? ''} onChange={(e) => set(c.slug, 'cert_hours', e.target.value)} /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 14, minHeight: 40, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 20, height: 20 }} checked={r.requires_full_payment !== false} onChange={(e) => set(c.slug, 'requires_full_payment', e.target.checked)} /> Certificate needs full payment
            </label>
            <div style={{ marginTop: 10 }}><button style={primary} onClick={() => post({ action: 'set_rule', slug: c.slug, ...r })}>Save {c.title}</button></div>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectReviewsPanel({ projects, act }: { projects: Json[]; act: (url: string, body: Json) => void }) {
  const [fb, setFb] = useState<Record<string, string>>({});
  return (
    <div style={wrap}>
      {!projects.length && <div style={{ ...card, opacity: 0.7 }}>No projects waiting.</div>}
      {projects.map((p) => (
        <div key={p.id} style={{ ...card, borderLeft: '3px solid var(--blueprint)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: 17 }}>{p.title}</strong>
            <span style={chip('var(--blueprint)')}>v{p.rev_no} · {String(p.status).replace('_', ' ')}</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>{p.student_projects?.publish_consent ? `May be published as "${p.student_projects.public_display_name}"` : 'Private: no publish consent'}</div>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, margin: '12px 0' }}>{p.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(p.links ?? []).map((l: string) => <a key={l} style={{ ...ghost, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={l} target="_blank" rel="noopener noreferrer nofollow">Open link</a>)}
            {[p.cover_path, ...(p.gallery_paths ?? [])].filter(Boolean).map((x: string, i: number) => <a key={x} style={{ ...ghost, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={`/api/admin/student-projects/asset?path=${encodeURIComponent(x)}`} target="_blank" rel="noreferrer">Image {i + 1}</a>)}
            {(p.private_files ?? []).map((f: Json) => <a key={f.path} style={{ ...ghost, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={`/api/admin/student-projects/asset?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noreferrer">{f.name}</a>)}
          </div>
          <label style={{ ...label, marginTop: 16 }}>Feedback for the student (required when asking for changes)</label>
          <textarea style={{ ...input, minHeight: 80 }} value={fb[p.id] ?? ''} onChange={(e) => setFb({ ...fb, [p.id]: e.target.value })} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            <button style={primary} onClick={() => act('/api/admin/student-projects', { revisionId: p.id, decision: 'approved', feedback: fb[p.id] ?? '' })}>Approve</button>
            <button style={ghost} onClick={() => act('/api/admin/student-projects', { revisionId: p.id, decision: 'changes_requested', feedback: fb[p.id] ?? '' })}>Request changes</button>
            <button style={ghost} onClick={() => act('/api/admin/student-projects', { revisionId: p.id, decision: 'under_review', feedback: fb[p.id] ?? '' })}>Mark under review</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CertificatesPanel({ d, post }: { d: Json; post: (b: Json) => void }) {
  const [q, setQ] = useState('');
  const all: Json[] = d.certificates ?? [];
  const list = all.filter((c) => !q.trim() || `${c.certificate_id} ${c.student_name} ${c.course_suffix}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div style={wrap}>
      <input style={{ ...input, maxWidth: 340, marginBottom: 16 }} placeholder="Search ID, name or course" value={q} onChange={(e) => setQ(e.target.value)} />
      {!list.length && <div style={{ ...card, opacity: 0.7 }}>No certificates found.</div>}
      {list.map((c) => (
        <div key={c.id} style={{ ...card, borderLeft: `3px solid ${c.revoked ? '#e55' : GREEN}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{c.student_name}</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{c.course_suffix} · {c.issue_date}</div>
              <div style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>{c.certificate_id} · issued by {c.issued_by ?? 'admin (old)'}</div>
            </div>
            <span style={{ ...chip(c.revoked ? '#e55' : GREEN), alignSelf: 'flex-start' }}>{c.revoked ? 'Revoked' : 'Valid'}</span>
          </div>
          {c.revoked && c.revoked_reason && <div style={{ fontSize: 13, color: '#e55', marginTop: 8 }}>Reason: {c.revoked_reason}</div>}
          {!c.revoked && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              {c.plan_id && <button style={ghost} onClick={() => window.confirm("Revoke this and issue a corrected one from the student's current certificate name?") && post({ action: 'cert_reissue', id: c.id })}>Reissue</button>}
              <button style={{ ...ghost, color: '#e55', borderColor: '#733' }} onClick={() => { const reason = window.prompt('Reason for revoking?'); if (reason) post({ action: 'cert_revoke', id: c.id, reason }); }}>Revoke</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TestimonialsPanel({ d, post }: { d: Json; post: (b: Json) => void }) {
  const [fb, setFb] = useState<Record<string, string>>({});
  const list: Json[] = d.testimonials ?? [];
  return (
    <div style={wrap}>
      <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>Student testimonials waiting for review, and live ones. Old website-form testimonials stay on the Testimonials page.</p>
      {!list.length && <div style={{ ...card, opacity: 0.7 }}>None yet.</div>}
      {list.map((t) => (
        <div key={t.id} style={{ ...card, borderLeft: `3px solid ${t.status === 'approved' ? GREEN : 'var(--brass)'}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
            <strong style={{ fontSize: 17 }}>{t.public_display_name}</strong>
            <span style={chip(t.status === 'approved' ? GREEN : 'var(--brass)')}>{t.status === 'approved' ? 'Live' : 'Waiting for review'}</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Photo: {t.photo}{t.photo_consent_at ? '' : ' (no consent)'}</div>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, margin: '12px 0' }}>{t.quote}</p>
          {t.status === 'submitted' && (<>
            <label style={label}>Note to the student (needed to request changes)</label>
            <input style={input} value={fb[t.id] ?? ''} onChange={(e) => setFb({ ...fb, [t.id]: e.target.value })} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              <button style={primary} onClick={() => post({ action: 'testimonial_approve', id: t.id })}>Approve and publish</button>
              <button style={ghost} onClick={() => post({ action: 'testimonial_changes', id: t.id, feedback: fb[t.id] })}>Request changes</button>
            </div>
          </>)}
          {t.status === 'approved' && <button style={ghost} onClick={() => window.confirm('Take this off the website?') && post({ action: 'testimonial_remove', id: t.id })}>Remove from website</button>}
        </div>
      ))}
    </div>
  );
}

export function AuditPanel({ d }: { d: Json }) {
  const list: Json[] = d.audit ?? [];
  return (
    <div style={wrap}>
      {!list.length && <div style={{ ...card, opacity: 0.7 }}>Nothing logged yet.</div>}
      {list.map((e) => (
        <div key={e.id} style={{ ...card, padding: '12px 16px', marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div><strong style={{ fontSize: 14 }}>{String(e.action).replace(/_/g, ' ')}</strong><div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{e.actor_type} {e.actor_ref ?? ''}{e.subject ? ` · ${e.subject}` : ''}</div></div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{fmt(e.created_at)}</div>
        </div>
      ))}
    </div>
  );
}
