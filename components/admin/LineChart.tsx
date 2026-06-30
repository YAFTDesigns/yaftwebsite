'use client';

export type LinePoint = { label: string; value: number };

export default function LineChart({
  points,
  color = 'var(--brass)',
  height = 120,
  currencyPrefix = '',
}: {
  points: LinePoint[];
  color?: string;
  height?: number;
  currencyPrefix?: string;
}) {
  const formatValue = (v: number) =>
    currencyPrefix ? `${currencyPrefix}${v.toLocaleString('en-IN')}` : String(v);

  const width = 600;
  const pad = 24;
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = Math.min(0, ...points.map((p) => p.value));
  const range = max - min || 1;

  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p.value - min) / range) * (height - pad * 2);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? 0} ${height - pad} L ${coords[0]?.x ?? 0} ${height - pad} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ minWidth: 320 }}>
        {/* baseline grid */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--line)" strokeWidth={1} />

        {coords.length > 1 && (
          <path d={areaPath} fill={color} opacity={0.08} />
        )}
        {coords.length > 1 && (
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={3} fill={color} />
            <text x={c.x} y={height - 6} textAnchor="middle" fontSize="9" fill="var(--ink-soft)" fontFamily="var(--mono)">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
      {points.length > 0 && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
          Latest: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{formatValue(points[points.length - 1].value)}</span>
        </p>
      )}
    </div>
  );
}
