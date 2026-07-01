'use client';

import { getStoredCreds } from '@/lib/syllabusAccess';
import { OPEN_COURSE_GATE_EVENT, type CourseGateDetail } from './CourseGateModal';
import { useRouter } from 'next/navigation';

export default function CourseGateButton({ href, course, slug }: { href: string; course: string; slug: string }) {
  const router = useRouter();

  function handleClick() {
    const creds = getStoredCreds();
    if (creds) {
      router.push(href);
      return;
    }
    window.dispatchEvent(
      new CustomEvent<CourseGateDetail>(OPEN_COURSE_GATE_EVENT, { detail: { href, course, slug } })
    );
  }

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
