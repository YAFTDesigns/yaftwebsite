import { describe, it, expect } from 'vitest';
import { isJunkEmail, summariseFollowUpLogs, buildFollowUpEmail, rankCandidates, selectionReason, MAX_FAILED_ATTEMPTS } from './leadFollowUp';

describe('isJunkEmail', () => {
  it('flags test/junk addresses', () => {
    for (const e of ['test@gmail.com', 'hzhzh@ajjf.com', 'a@example.com', 'noreply@x.com', 'nodomain', 'abc123@gmail.com']) {
      expect(isJunkEmail(e), e).toBe(true);
    }
  });
  it('keeps normal addresses', () => {
    for (const e of ['leon.ordaz@woolpert.com', 'mayur60027@gmail.com', 'rdeepti09@gmail.com', 'kk1805@srmist.edu.in']) {
      expect(isJunkEmail(e), e).toBe(false);
    }
  });
});

describe('summariseFollowUpLogs', () => {
  it('a failed attempt does not mark the lead as done', () => {
    const { done, failed } = summariseFollowUpLogs([{ to_email: 'A@x.com', status: 'failed' }]);
    expect(done.has('a@x.com')).toBe(false);
    expect(failed.get('a@x.com')).toBe(1);
  });
  it('sent, bounced and complained all count as done', () => {
    const { done } = summariseFollowUpLogs([
      { to_email: 'a@x.com', status: 'sent' }, { to_email: 'b@x.com', status: 'bounced' }, { to_email: 'c@x.com', status: 'complained' },
    ]);
    expect([...done].sort()).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    expect(MAX_FAILED_ATTEMPTS).toBe(2);
  });
});

describe('buildFollowUpEmail', () => {
  const base = { name: null, course_interest: null };
  it('does not imply a prior conversation for gate leads', () => {
    for (const source of ['syllabus_gate', 'whatsapp_gate']) {
      const { subject, html } = buildFollowUpEmail({ ...base, source });
      const text = (subject + html).toLowerCase();
      expect(text).not.toContain('reached out');
      expect(text).not.toContain('still thinking');
      expect(text).not.toContain('picking up where we left off');
    }
    expect(buildFollowUpEmail({ ...base, source: 'syllabus_gate' }).html).toContain('unlocked a course syllabus');
    expect(buildFollowUpEmail({ ...base, source: 'whatsapp_gate' }).html).toContain('WhatsApp');
  });
  it('contact-form wording references the enquiry and course', () => {
    const { subject, html } = buildFollowUpEmail({ source: 'contact_form', name: 'Mayur Bhagath', course_interest: 'Rhino3D for Architecture' });
    expect(subject).toContain('Rhino3D for Architecture');
    expect(html).toContain('Hi Mayur,');
  });
  it('tags every link with campaign UTMs and escapes names', () => {
    const { html } = buildFollowUpEmail({ source: 'syllabus_gate', name: '<b>x</b>', course_interest: null });
    const links = html.match(/href="[^"]+"/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) { expect(l).toContain('utm_campaign=lead_follow_up'); expect(l).toContain('utm_content=syllabus_gate'); }
    expect(html).not.toContain('<b>x</b>');
  });
  it('contains an opt-out line and no em dashes', () => {
    const { html } = buildFollowUpEmail({ source: 'contact_form', name: null, course_interest: null });
    expect(html).toContain('no thanks');
    expect(html).not.toContain('—');
  });
});

describe('ranking and reason', () => {
  const now = new Date('2026-10-03T00:00:00Z').getTime();
  it('puts contact-form and course-interest leads first, then most recent', () => {
    const list = [
      { source: 'syllabus_gate', course_interest: null, last_seen: '2026-09-28T00:00:00Z' },
      { source: 'contact_form', course_interest: 'Rhino3D for Architecture', last_seen: '2026-09-01T00:00:00Z' },
      { source: 'syllabus_gate', course_interest: 'Rhino3D for Architecture', last_seen: '2026-09-10T00:00:00Z' },
    ];
    expect(rankCandidates(list).map((c) => c.source + ':' + c.last_seen.slice(5, 10))).toEqual(['contact_form:09-01', 'syllabus_gate:09-10', 'syllabus_gate:09-28']);
  });
  it('explains the selection', () => {
    const r = selectionReason({ source: 'contact_form', course_interest: 'Rhino.Inside.Revit', last_seen: '2026-09-23T00:00:00Z', status: 'new' }, now);
    expect(r).toContain('contact form');
    expect(r).toContain('Rhino.Inside.Revit');
    expect(r).toContain('10 days ago');
  });
});
