// Pure builder for the admin "Service journeys" report. Input rows come from
// the service_journey_events and enquiry_interest_segment_counts views.
import { COURSE_NAV_LIST } from '@/app/courses/courseNav';

export type JourneyEvent = { stage: string; key: string | null; sessions: number };
export type InterestCount = { course_interest: string; segment: string; enquiries: number };

export type JourneyRow = {
  group: 'Courses' | 'Services';
  label: string;
  viewed: number | null;       // sessions that viewed the page
  cta: number | null;          // sessions that clicked an enquiry button for it
  gateOpen: number | null;     // syllabus modal opened (courses only)
  unlocked: number | null;     // syllabus unlocked (courses only)
  enquiries: number;           // enquiry rows naming it as the interest
};

const SERVICES = [
  { key: 'parametric-facade', label: 'Parametric facade fabrication', interests: ['Parametric facade fabrication'] },
  { key: 'shop-drawing', label: 'Shop drawing automation', interests: ['Shop drawing automation'] },
  { key: 'college-workshops', label: 'College workshops', interests: ['College workshop', 'Institutional workshop'] },
  { key: 'corporate-training', label: 'Corporate training', interests: ['Corporate training'] },
] as const;

function sum(rows: { n: number }[]) { return rows.reduce((s, r) => s + r.n, 0); }

export function buildJourney(events: JourneyEvent[], interests: InterestCount[]) {
  const ev = (stage: string, key: string) => events.find((e) => e.stage === stage && e.key === key)?.sessions ?? 0;
  const enq = (names: readonly string[]) => sum(interests.filter((i) => names.includes(i.course_interest)).map((i) => ({ n: i.enquiries })));

  const courseCta = events.filter((e) => e.stage === 'cta_click' && e.key === 'course').reduce((s, e) => s + e.sessions, 0);

  const rows: JourneyRow[] = [
    ...COURSE_NAV_LIST.map((c): JourneyRow => ({
      group: 'Courses',
      label: c.title,
      viewed: ev('course_viewed', c.href.split('/').pop() as string),
      cta: null, // course enquiry buttons are tracked in aggregate only (see courseCtaTotal)
      gateOpen: ev('gate_open', c.dbSlug),
      unlocked: ev('unlocked', c.dbSlug),
      enquiries: enq([c.enquiryLabel]),
    })),
    ...SERVICES.map((s): JourneyRow => ({
      group: 'Services',
      label: s.label,
      viewed: ev('services_page_viewed', '/services'),
      cta: ev('cta_click', s.key),
      gateOpen: null,
      unlocked: null,
      enquiries: enq(s.interests),
    })),
    {
      group: 'Services', label: 'Consulting project', viewed: ev('services_page_viewed', '/services'),
      cta: null, gateOpen: null, unlocked: null, enquiries: enq(['Consulting project']),
    },
  ];

  const bySegment: Record<string, number> = {};
  for (const i of interests) bySegment[i.segment] = (bySegment[i.segment] ?? 0) + i.enquiries;

  return { rows, courseCtaTotal: courseCta, bySegment };
}

export function pct(n: number, d: number | null): string {
  if (!d) return '–';
  return `${Math.round((n / d) * 100)}%`;
}
