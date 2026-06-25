'use client';

import { getStoredCreds, requestSyllabusAccess } from '@/lib/syllabusAccess';

export const OPEN_SYLLABUS_EVENT = 'yaft:open-syllabus';

export type SyllabusOpenDetail = { pdf: string; course: string; slug: string };

export default function SyllabusButton({ pdf, course, slug }: { pdf: string; course: string; slug: string }) {
  async function handleClick() {
    const creds = getStoredCreds();

    if (creds) {
      // Open the tab synchronously (within the click's user-activation window), then
      // redirect it once we have a URL — awaiting the fetch first risks popup blockers.
      const tab = window.open('', '_blank');
      const url = await requestSyllabusAccess(slug, creds, pdf);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank');
      return;
    }
    window.dispatchEvent(
      new CustomEvent<SyllabusOpenDetail>(OPEN_SYLLABUS_EVENT, { detail: { pdf, course, slug } })
    );
  }

  return (
    <button type="button" className="syllabus-link" onClick={handleClick}>
      View syllabus (PDF)
    </button>
  );
}
