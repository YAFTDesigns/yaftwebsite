'use client';

import { useCourseGateClick } from '@/lib/useCourseGateClick';

export default function CourseGateButton({ href, course, slug }: { href: string; course: string; slug: string }) {
  const handleClick = useCourseGateClick(href, course, slug);

  return (
    <button type="button" onClick={handleClick} style={{
      background: 'transparent', border: 'none', padding: 0,
      fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--blueprint)',
      letterSpacing: '0.06em', cursor: 'pointer', textAlign: 'left',
    }}>
      VIEW FULL COURSE &amp; SYLLABUS →
    </button>
  );
}

