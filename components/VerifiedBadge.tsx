// The "Verified student" shield. Means: a paid YAFT enrolment AND a LinkedIn account connected by LinkedIn sign-in, shown with the student's consent.
// Plain SVG so it works in server and client components. Also meant for the future student forum.
export default function VerifiedBadge({ size = 16, label = 'Verified student: enrolled at YAFT Designs with a connected LinkedIn account' }: { size?: number; label?: string }) {
  return (
    <span title={label} role="img" aria-label="Verified student" style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" fill="#1f6feb" />
        <path d="m8.2 12.2 2.6 2.6 5-5.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
