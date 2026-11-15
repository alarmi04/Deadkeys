/** Línea de tendencia mínima: valores en orden cronológico, de izquierda (antigua) a derecha (reciente). */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const W = 120;
  const H = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = max === min ? H / 2 : H - 3 - ((v - min) / span) * (H - 6);
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-9 w-full overflow-visible"
      role="img"
      aria-label={label}
    >
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="var(--brass)" fillOpacity="0.12" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--brass)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r="2.2" fill="var(--ivory)" />
    </svg>
  );
}
