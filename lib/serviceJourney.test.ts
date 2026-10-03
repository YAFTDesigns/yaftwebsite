import { describe, it, expect } from 'vitest';
import { buildJourney, pct } from './serviceJourney';

describe('buildJourney', () => {
  const events = [
    { stage: 'course_viewed', key: 'rhino3d-architecture', sessions: 32 },
    { stage: 'gate_open', key: 'rhino-architecture', sessions: 20 },
    { stage: 'unlocked', key: 'rhino-architecture', sessions: 8 },
    { stage: 'services_page_viewed', key: '/services', sessions: 55 },
    { stage: 'cta_click', key: 'college-workshops', sessions: 4 },
    { stage: 'cta_click', key: 'course', sessions: 9 },
  ];
  const interests = [
    { course_interest: 'Rhino3D for Architecture', segment: 'individual', enquiries: 17 },
    { course_interest: 'Rhino3D for Architecture', segment: 'unknown', enquiries: 1 },
    { course_interest: 'College workshop', segment: 'college', enquiries: 2 },
    { course_interest: 'Institutional workshop', segment: 'college', enquiries: 1 },
  ];
  const j = buildJourney(events, interests);

  it('maps route slug for views and db slug for gate events', () => {
    const r = j.rows.find((x) => x.label === 'Rhino3D for Architecture')!;
    expect([r.viewed, r.gateOpen, r.unlocked, r.enquiries]).toEqual([32, 20, 8, 18]);
  });
  it('services share the /services page views and use CTA clicks per service', () => {
    const w = j.rows.find((x) => x.label === 'College workshops')!;
    expect([w.viewed, w.cta, w.enquiries]).toEqual([55, 4, 3]);
    expect(j.rows.find((x) => x.label === 'Corporate training')!.cta).toBe(0);
  });
  it('totals course CTAs and splits enquiries by segment', () => {
    expect(j.courseCtaTotal).toBe(9);
    expect(j.bySegment).toEqual({ individual: 17, unknown: 1, college: 3 });
  });
  it('pct is safe on zero', () => {
    expect(pct(1, 0)).toBe('–');
    expect(pct(1, 4)).toBe('25%');
  });
});
