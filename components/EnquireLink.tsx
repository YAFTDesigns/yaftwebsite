'use client';

export default function EnquireLink({ course }: { course: string }) {
  return (
    <a
      href="#contact"
      className="enquire"
      onClick={() => {
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
