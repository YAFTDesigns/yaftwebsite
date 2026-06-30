'use client';

export type PieSlice = { label: string; value: number; color: string };

export default function PieChart({ slices, size = 160 }: { slices: PieSlice[]; size?: number }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const r = size / 2;
  const cx = r;
  const cy = r;
  const innerR = r * 0.6; // donut hole

  let angle = -90; // start at top
  const paths = slices.map((slice) => {
    if (total === 0 || slice.value === 0) return null;
    const fraction = slice.value / total;
    const sweep = fraction * 360;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const ix1 = cx + innerR * Math.cos(toRad(startAngle));
    const iy1 = cy + innerR * Math.sin(toRad(startAngle));
    const ix2 = cx + innerR * Math.cos(toRad(endAngle));
    const iy2 = cy + innerR * Math.sin(toRad(endAngle));
    const largeArc = sweep > 180 ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    return <path key={slice.label} d={d} fill={slice.color} />;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0
          ? <circle cx={cx} cy={cy} r={(r + innerR) / 2} fill="none" stroke="var(--line)" strokeWidth={r - innerR} />
          : paths}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--ink)" fontFamily="var(--display)">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--ink-soft)" fontFamily="var(--mono)" letterSpacing="0.04em">
          TOTAL
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>
              {s.label} <span style={{ color: 'var(--ink)' }}>({s.value})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
