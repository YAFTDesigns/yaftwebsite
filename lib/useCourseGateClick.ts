'use client';

import { useRouter } from 'next/navigation';
import { getStoredCreds } from '@/lib/syllabusAccess';
import { OPEN_COURSE_GATE_EVENT, type CourseGateDetail } from '@/components/CourseGateModal';

/**
 * Shared click behavior for anything that should take the user to a
 * gated course detail page: if they've already unlocked a syllabus
 * this session, go straight there; otherwise open the same gate modal
 * used by the "VIEW FULL COURSE & SYLLABUS" button. Used by both that
 * button and the clickable course card image, so the two never drift
 * out of sync with each other.
 */
export function useCourseGateClick(href: string, course: string, slug: string) {
  const router = useRouter();
  return function handleClick() {
    const creds = getStoredCreds();
    if (creds) {
      router.push(href);
      return;
    }
    window.dispatchEvent(
      new CustomEvent<CourseGateDetail>(OPEN_COURSE_GATE_EVENT, { detail: { href, course, slug } })
    );
  };
}
