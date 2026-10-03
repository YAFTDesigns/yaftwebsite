'use client';

import { track } from '@/lib/analytics';

export default function EnquireLink({ course }: { course: string }) {
  return (
    <a
      href="#contact"
      className="enquire"
      onClick={() => {
        track('cta_click', { page: window.location.pathname, meta: { service: 'course', cta: 'course_enquire', interest: course } });
        const select = document.getElementById('interestSelect') as HTMLSelectElement | null;
        if (!select) return;
        const match = Array.from(select.options).find((o) => o.value === course);
        if (match) select.value = match.value;
      }}
    >
      Enquire →
    </a>
  );
}
