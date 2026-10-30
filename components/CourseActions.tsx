'use client';

import { useEffect, useState } from 'react';
import { CONTACT_EMAIL } from '@/lib/contact';

type Status = { signedIn: boolean; enrolled?: boolean; nextAction?: 'pay_advance' | 'pay_balance' | 'pay_full' | null; payUrl?: string };

/**
 * Enroll / My course / Pay balance for one course, the corporate enquiry link, and the project link.
 * Guests keep the normal guest checkout. Signed-in students are recognised by the server session.
 */
export default function CourseActions({ slug, title }: { slug: string; title: string }) {
  const [st, setSt] = useState<Status | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/student/course-status?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j) setSt(j); }).catch(() => {});
    // Records the visit only for a signed-in student who opted in (the server decides; anonymous visits record nothing).
    fetch('/api/student/interest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, event: 'viewed' }) }).catch(() => {});
    return () => { live = false; };
  }, [slug]);

  const corp = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Corporate / Team Training enquiry: ${title}`)}&body=${encodeURIComponent(`Hello YAFT Designs,\n\nWe would like to discuss team training for: ${title}\n\nCompany:\nTeam size:\nGoals:\nPreferred dates:\nDelivery (in person / online):\n`)}`;
  const btn = { display: 'inline-block', padding: '10px 16px', border: '1px solid var(--line)', textDecoration: 'none', fontSize: 14, marginRight: 10, marginBottom: 8, color: 'var(--ink)' } as const;
  return (
    <div style={{ margin: '18px 0' }}>
      {st?.enrolled ? (
        <>
          <a href="/student" style={btn}>My course</a>
          {st.nextAction === 'pay_balance' && st.payUrl && <a href={st.payUrl} style={{ ...btn, background: 'var(--ink)', color: 'var(--paper)' }}>Pay balance</a>}
          <a href={`/student?submit=${encodeURIComponent(slug)}`} style={btn}>Submit your project</a>
        </>
      ) : (
        <a href={`/enroll?course=${encodeURIComponent(slug)}`} style={{ ...btn, background: 'var(--ink)', color: 'var(--paper)' }}
           onClick={() => { fetch('/api/student/interest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, event: 'enroll_clicked' }) }).catch(() => {}); }}>Enroll Now</a>
      )}
      <a href={corp} style={btn}>Corporate / Team Training</a>
      <a href="/student" style={{ ...btn, border: 'none', textDecoration: 'underline' }}>Student login</a>
    </div>
  );
}
