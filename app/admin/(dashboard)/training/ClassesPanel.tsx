'use client';

import { useCallback, useEffect, useState } from 'react';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const API = '/api/admin/training/classes';
const GREEN = '#4caf50';
const label = { display: 'block', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 6 } as const;
const input = { width: '100%', minHeight: 44, background: 'var(--paper)', border: '1px solid #3a3a3a', color: 'var(--ink)', padding: '10px 12px', fontSize: 14, borderRadius: 6, boxSizing: 'border-box' } as const;
const primary = { minHeight: 46, padding: '0 26px', background: '#D42B38', color: '#fff', border: '1px solid #D42B38', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' } as const;
const ghost = { minHeight: 40, padding: '0 16px', background: 'transparent', color: 'var(--ink)', border: '1px solid #666', borderRadius: 6, fontSize: 13, cursor: 'pointer' } as const;
const pill = (on: boolean, disabled = false) => ({ minHeight: 40, padding: '0 16px', borderRadius: 999, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, background: on ? 'rgba(76,175,80,.16)' : 'transparent', color: on ? GREEN : 'var(--ink)', border: `1px solid ${on ? GREEN : '#555'}` }) as const;
const card = { border: '1px solid var(--line)', background: 'var(--paper-2)', borderRadius: 10, padding: 18, marginBottom: 14 } as const;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const blank = { course_slug: '', title: '', starts_at: '', duration_min: '90', meet_url: '', repeat_count: '1', step_days: '7', notes: '', student_ids: [] as string[], weekdays: [] as number[], notify: true };

const tIST = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...o });

export default function ClassesPanel({ courses }: { courses: Json[] }) {
  const [rows, setRows] = useState<Json[]>([]);
  const [roster, setRoster] = useState<Record<string, Json[]>>({});
  const [meetAuto, setMeetAuto] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [show, setShow] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState<Json>(blank);
  const [ed, setEd] = useState<Json | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await fetch(API, { cache: 'no-store' });
    if (r.ok) { const j = await r.json(); setRows(j.sessions ?? []); setRoster(j.roster ?? {}); setMeetAuto(!!j.meetAuto); setNow(Date.now()); }
  }, []);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); }, [load]);

  async function act(body: Json, okText?: (j: Json) => string) {
    setBusy(true);
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? (okText ? okText(j) : 'Saved.') : j.error ?? 'Failed' });
    if (r.ok) await load();
    return r.ok;
  }

  const isPast = (c: Json) => new Date(c.ends_at).getTime() + 30 * 60_000 < now;
  const list = rows.filter((c) => (show === 'all' ? true : show === 'past' ? isPast(c) : !isPast(c))).sort((a, b) => (show === 'past' ? -1 : 1) * (new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
  const people: Json[] = roster[nc.course_slug] ?? [];

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['upcoming', 'past', 'all'] as const).map((k) => <button key={k} style={pill(show === k)} onClick={() => setShow(k)}>{k === 'upcoming' ? 'Upcoming' : k === 'past' ? 'Past' : 'All'}</button>)}
        </div>
        <button style={primary} onClick={() => setAdding((v) => !v)}>{adding ? 'Close form' : '+ New class'}</button>
      </div>

      {msg && <div style={{ ...card, padding: '12px 16px', borderLeft: `3px solid ${msg.ok ? GREEN : '#e55'}`, color: msg.ok ? GREEN : '#e55', fontSize: 14 }}>{msg.text}</div>}

      {adding && (
        <div style={{ ...card, borderLeft: '3px solid var(--blueprint)' }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
            <div><label style={label}>Course</label>
              <select style={input} value={nc.course_slug} onChange={(e) => setNc({ ...nc, course_slug: e.target.value, student_ids: [] })}><option value="">Choose a course</option>{courses.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></div>
            <div><label style={label}>Title (optional)</label><input style={input} placeholder="Uses the course name if blank" value={nc.title} onChange={(e) => setNc({ ...nc, title: e.target.value })} /></div>
            <div><label style={label}>First class (India time)</label><input style={input} type="datetime-local" value={nc.starts_at} onChange={(e) => setNc({ ...nc, starts_at: e.target.value })} /></div>
            <div><label style={label}>Minutes per class</label><input style={input} inputMode="numeric" value={nc.duration_min} onChange={(e) => setNc({ ...nc, duration_min: e.target.value })} /></div>
            <div><label style={label}>How many classes</label><input style={input} inputMode="numeric" value={nc.repeat_count} onChange={(e) => setNc({ ...nc, repeat_count: e.target.value })} /></div>
            <div><label style={label}>{meetAuto ? 'Meet link (empty = create one per class)' : 'Meet link'}</label><input style={input} placeholder={meetAuto ? 'Leave empty: a new Google Meet link per class' : 'https://meet.google.com/...'} value={nc.meet_url} onChange={(e) => setNc({ ...nc, meet_url: e.target.value })} /></div>
          </div>

          <div style={{ marginTop: 18 }}><label style={label}>Repeat on (leave empty to repeat every {nc.step_days} days)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {DAYS.map((n, i) => <button key={n} type="button" style={pill(nc.weekdays.includes(i))} onClick={() => setNc({ ...nc, weekdays: nc.weekdays.includes(i) ? nc.weekdays.filter((x: number) => x !== i) : [...nc.weekdays, i] })}>{n}</button>)}
              <input style={{ ...input, width: 70, minHeight: 40 }} aria-label="Gap in days" value={nc.step_days} onChange={(e) => setNc({ ...nc, step_days: e.target.value })} /><span style={{ fontSize: 12, opacity: 0.6 }}>days gap</span>
            </div></div>

          <div style={{ marginTop: 18 }}><label style={label}>Who is it for</label>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>{nc.student_ids.length ? `Private session for ${nc.student_ids.length} student${nc.student_ids.length > 1 ? 's' : ''} (maximum 3)` : 'Whole course: everyone enrolled. Pick up to 3 students to make it private.'}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {people.map((p) => { const on = nc.student_ids.includes(p.studentId); return (
                <button key={p.studentId} type="button" style={pill(on, !on && nc.student_ids.length >= 3)} disabled={!on && nc.student_ids.length >= 3}
                  onClick={() => setNc({ ...nc, student_ids: on ? nc.student_ids.filter((x: string) => x !== p.studentId) : [...nc.student_ids, p.studentId] })}>{on ? '✓ ' : ''}{p.name}</button>); })}
              {nc.course_slug && !people.length && <span style={{ fontSize: 13, opacity: 0.6 }}>No paid students in this course yet.</span>}
              {!nc.course_slug && <span style={{ fontSize: 13, opacity: 0.6 }}>Choose a course first.</span>}
            </div></div>

          <div style={{ marginTop: 18 }}><label style={label}>Description for the student (optional)</label><input style={input} value={nc.notes} onChange={(e) => setNc({ ...nc, notes: e.target.value })} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 14, minHeight: 40, cursor: 'pointer' }}><input type="checkbox" style={{ width: 20, height: 20 }} checked={nc.notify} onChange={(e) => setNc({ ...nc, notify: e.target.checked })} /> Email the student{nc.student_ids.length === 1 ? '' : 's'} that classes are scheduled</label>
          <div style={{ marginTop: 14 }}><button style={primary} disabled={busy} onClick={async () => { const ok = await act({ action: 'create', ...nc }, (j) => `Added ${j.count} class${j.count > 1 ? 'es' : ''}${j.emailed ? ` and emailed ${j.emailed} student${j.emailed > 1 ? 's' : ''}` : ''}.`); if (ok) { setNc({ ...blank, course_slug: nc.course_slug }); setAdding(false); } }}>{busy ? 'Saving…' : Number(nc.repeat_count) > 1 ? 'Add classes' : 'Add class'}</button></div>
        </div>
      )}

      {list.length === 0 && <div style={{ ...card, opacity: 0.7 }}>{show === 'upcoming' ? 'No upcoming classes. Use + New class to add some.' : 'Nothing here yet.'}</div>}

      {list.map((c) => {
        const past = isPast(c);
        const live = !past && new Date(c.starts_at).getTime() - 15 * 60_000 <= now;
        const present = (c.people ?? []).filter((p: Json) => p.present).length;
        const editing = ed?.id === c.id;
        return (
          <div key={c.id} style={{ ...card, borderLeft: `3px solid ${live ? GREEN : past ? '#555' : 'var(--blueprint)'}` }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 86, textAlign: 'center', borderRight: '1px solid var(--line)', paddingRight: 18 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '.06em' }}>{tIST(c.starts_at, { weekday: 'short' })}</div>
                <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{tIST(c.starts_at, { day: '2-digit' })}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{tIST(c.starts_at, { month: 'short' })}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{tIST(c.starts_at, { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 17 }}>{c.title}</strong>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, border: `1px solid ${live ? GREEN : '#555'}`, color: live ? GREEN : 'var(--ink-soft)' }}>{live ? 'Open now' : past ? 'Done' : 'Upcoming'}</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{courses.find((x) => x.slug === c.course_slug)?.title ?? c.course_slug} · {c.forName ? `Private: ${c.forName}` : 'Whole course'}</div>
                {c.notes && <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>{c.notes}</div>}

                <div style={{ marginTop: 14 }}>
                  <div style={{ ...label, marginBottom: 8 }}>Attendance: {present} of {c.enrolledCount} present · tap a name to change</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(c.people ?? []).map((p: Json) => (
                      <button key={p.studentId} style={pill(p.present)} disabled={busy}
                        onClick={() => act({ action: 'mark_attendance', id: c.id, student_id: p.studentId, present: !p.present }, () => `${p.name} marked ${p.present ? 'absent' : 'present'}.`)}>
                        {p.present ? '✓' : '○'} {p.name}{p.manual ? ' (marked)' : p.times > 1 ? ` · joined ${p.times}x` : ''}
                      </button>))}
                    {!(c.people ?? []).length && <span style={{ fontSize: 13, opacity: 0.6 }}>No paid students in this class yet.</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                  <button style={ghost} onClick={() => setEd(editing ? null : { id: c.id, title: c.title, notes: c.notes ?? '', starts_at: new Date(new Date(c.starts_at).getTime() + 5.5 * 3600_000).toISOString().slice(0, 16), duration_min: String(Math.round((new Date(c.ends_at).getTime() - new Date(c.starts_at).getTime()) / 60000)), scope: 'one', meet_url: '', series: !!c.series_id, private: !!c.student_ids, notify: !!c.student_ids })}>Reschedule</button>
                  <a style={{ ...ghost, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={c.meet_url} target="_blank" rel="noopener noreferrer">Open Meet</a>
                  <button style={ghost} onClick={() => { const v = window.prompt('Recording link (shown to students after class)', c.recording_url ?? ''); if (v !== null) act({ action: 'update', id: c.id, recording_url: v }); }}>Recording link</button>
                  <button style={{ ...ghost, color: '#e55', borderColor: '#733' }} onClick={() => { if (window.confirm('Cancel this class? Students will no longer see it.')) act({ action: 'cancel', id: c.id }, () => 'Class cancelled.'); }}>Cancel class</button>
                </div>

                {editing && ed && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
                      <div><label style={label}>New date and time</label><input style={input} type="datetime-local" value={ed.starts_at} onChange={(e) => setEd({ ...ed, starts_at: e.target.value })} /></div>
                      <div><label style={label}>Minutes</label><input style={input} inputMode="numeric" value={ed.duration_min} onChange={(e) => setEd({ ...ed, duration_min: e.target.value })} /></div>
                      {ed.series && <div><label style={label}>Apply to</label><select style={input} value={ed.scope} onChange={(e) => setEd({ ...ed, scope: e.target.value })}><option value="one">Only this class</option><option value="following">This and all later classes</option></select></div>}
                      <div><label style={label}>Title</label><input style={input} value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={label}>New Meet link (blank keeps the current one)</label><input style={input} placeholder="https://meet.google.com/..." value={ed.meet_url} onChange={(e) => setEd({ ...ed, meet_url: e.target.value })} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={label}>Description</label><input style={input} value={ed.notes} onChange={(e) => setEd({ ...ed, notes: e.target.value })} /></div>
                    </div>
                    {ed.private && <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 14, minHeight: 40, cursor: 'pointer' }}><input type="checkbox" style={{ width: 20, height: 20 }} checked={ed.notify} onChange={(e) => setEd({ ...ed, notify: e.target.checked })} /> Email the student(s) the new time</label>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button style={primary} disabled={busy} onClick={async () => {
                        const ok1 = await act({ action: 'update', id: ed.id, title: ed.title, notes: ed.notes, ...(ed.meet_url.trim() ? { meet_url: ed.meet_url } : {}) });
                        if (!ok1) return;
                        const ok2 = await act({ action: 'reschedule', id: ed.id, starts_at: ed.starts_at, duration_min: ed.duration_min, scope: ed.scope, notify: ed.notify }, (j) => `Moved ${j.moved} class${j.moved > 1 ? 'es' : ''}${j.emailed ? ' and emailed the student' : ''}.`);
                        if (ok2) setEd(null);
                      }}>Save changes</button>
                      <button style={ghost} onClick={() => setEd(null)}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
