'use client';

import { useCourseGateClick } from '@/lib/useCourseGateClick';

export default function CourseVisualLink({
  href, course, slug, className, children,
}: {
  href: string; course: string; slug: string; className?: string; children: React.ReactNode;
}) {
  const handleClick = useCourseGateClick(href, course, slug);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-label={`View full course and syllabus for ${course}`}
      style={{
        display: 'block', width: '100%', padding: 0, margin: 0,
        border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
      }}
    >
      {children}
    </button>
  );
}
