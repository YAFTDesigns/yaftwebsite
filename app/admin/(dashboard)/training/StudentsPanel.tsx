'use client';

import { useState } from 'react';
import Link from 'next/link';
import { card, chip, ghost, GREEN, heading, input, primary } from './panelStyles';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function StudentsPanel({ d, post }: { d: Json; post: (body: Json) => void }) {
  const [q, setQ] = useState('');
  const claims: Json[] = d.claims ?? [];
  const students: Json[] = d.students ?? [];
  const links: Json[] = d.links ?? [];
  const shown = students.filter((s) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const mine = links.filter((l) => l.student_id === s.id).map((l) => l.course_payment_plans?.description ?? '').join(' ');
    return `${s.display_name ?? ''} ${s.certificate_name ?? ''} ${mine}`.toLowerCase().includes(t);
  });

  return (
    <div style={{ maxWidth: 980 }}>
      <h3 style={{ ...heading, marginTop: 0 }}>Linking requests that need a person ({claims.length})</h3>
      {!claims.length && <div style={{ ...card, opacity: 0.7 }}>Nothing waiting.</div>}
      {claims.map((c) => (
        <div key={c.id} style={{ ...card, borderLeft: '3px solid var(--brass)' }}>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date(c.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
          <div style={{ fontSize: 14, margin: '6px 0 14px' }}>{c.note}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={{ ...primary, opacity: c.plan_id ? 1 : 0.4 }} disabled={!c.plan_id} onClick={() => post({ action: 'resolve_claim', reviewId: c.id, decision: 'approved' })}>Link it</button>
            <button style={ghost} onClick={() => post({ action: 'resolve_claim', reviewId: c.id, decision: 'rejected' })}>Reject</button>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h3 style={{ ...heading, margin: '26px 0 0' }}>Students ({shown.length}{q ? ` of ${students.length}` : ''})</h3>
        <input style={{ ...input, maxWidth: 300 }} placeholder="Search name or course" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ marginTop: 14 }}>
        {!shown.length && <div style={{ ...card, opacity: 0.7 }}>No students match.</div>}
        {shown.map((s) => {
          const mine = links.filter((l) => l.student_id === s.id);
          return (
            <div key={s.id} style={{ ...card, borderLeft: `3px solid ${mine.length ? GREEN : '#555'}` }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                <div>
                  <Link href={`/admin/training/student/${s.id}`} style={{ fontSize: 17, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>{s.display_name ?? '-'}</Link>
                  <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>Certificate name: {s.certificate_name ?? '-'}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Joined {new Date(s.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div style={{ marginTop: 12 }}>
                {!mine.length && <span style={{ fontSize: 13, opacity: 0.6 }}>No enrolments linked.</span>}
                {mine.map((l) => (
                  <div key={l.plan_id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 14 }}>{l.course_payment_plans?.description} <span style={chip('#777')}>{l.linked_via}</span></div>
                    <button style={ghost} onClick={() => { if (window.confirm(`Unlink "${l.course_payment_plans?.description}" from ${s.display_name ?? 'this student'}? They will lose access to it in the portal. Payments and bills stay as they are.`)) post({ action: 'unlink_enrolment', studentId: l.student_id, planId: l.plan_id }); }}>Unlink</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
