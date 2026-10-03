'use client';

import { track } from '@/lib/analytics';

// A "start an enquiry" button for a service block. It records a cta_click
// (service = which offering, cta = where on the page), then jumps to the
// contact form with the right "Interested in" and audience preselected.
export default function ServiceCta({
  service,
  cta,
  interest,
  segment,
  label,
}: {
  service: string;
  cta: string;
  interest: string;
  segment?: 'individual' | 'college' | 'corporate';
  label: string;
}) {
  return (
    <a
      href="#contact"
      className="enquire"
      onClick={() => {
        track('cta_click', { page: window.location.pathname, meta: { service, cta, interest, ...(segment ? { segment } : {}) } });
        const interestSelect = document.getElementById('interestSelect') as HTMLSelectElement | null;
        if (interestSelect && Array.from(interestSelect.options).some((o) => o.value === interest)) interestSelect.value = interest;
        const segmentSelect = document.getElementById('contactSegment') as HTMLSelectElement | null;
        if (segmentSelect && segment) segmentSelect.value = segment;
      }}
    >
      {label} →
    </a>
  );
}
