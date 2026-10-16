/** Six hours of NEWS2 as a step line over faint bands at the 5 and 7 thresholds. */
const W = 132;
const H = 40;
const MAX = 18;

export function Strip({ values, label }: { values: number[]; label: string }) {
  const y = (v: number) => H - 2 - (Math.min(v, MAX) / MAX) * (H - 4);
  const step = W / (values.length - 1);
  let d = '';
  values.forEach((v, i) => {
    if (Number.isNaN(v)) return;
    const x = i * step;
    d += d ? ` H${x.toFixed(1)} V${y(v).toFixed(1)}` : `M${x.toFixed(1)} ${y(v).toFixed(1)}`;
  });
  const last = values[values.length - 1];
  const colour = last >= 7 ? 'var(--red)' : last >= 5 ? 'var(--amber)' : 'var(--brand)';
  return (
    <svg className="strip" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <rect x="0" y={y(MAX)} width={W} height={y(7) - y(MAX)} fill="var(--red-wash)" />
      <rect x="0" y={y(7)} width={W} height={y(5) - y(7)} fill="var(--amber-wash)" />
      <path d={d} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={W} cy={y(last)} r="3" fill={colour} />
    </svg>
  );
}

/** Small trend for one vital sign in the detail table. */
export function Spark({ values, label, range }: { values: number[]; label: string; range: [number, number] }) {
  // fixed clinical range per vital sign, so noise stays small and a real change looks like one
  const w = 120;
  const h = 28;
  const [lo, hi] = range;
  const span = hi - lo || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((Math.min(hi, Math.max(lo, v)) - lo) / span) * (h - 6)).toFixed(1)}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <polyline points={pts.join(' ')} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
