"use client";

import { useFormat } from "@/i18n/client";



/**
 * Indicador de ascensor art déco: la aguja marca un porcentaje de victorias
 * en una escala de 40 % a 60 %, con el 50 % en la vertical.
 */
export function Dial({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const { pct } = useFormat();
  const MIN = 0.4;
  const MAX = 0.6;
  const clamped = Math.min(MAX, Math.max(MIN, value));
  const angle = ((clamped - 0.5) / (MAX - 0.5)) * 90;

  const cx = 60;
  const cy = 60;
  const ticks = Array.from({ length: 11 }, (_, i) => MIN + i * 0.02);
  const polar = (v: number, r: number) => {
    const a = (((v - 0.5) / 0.1) * 90 - 90) * (Math.PI / 180);
    // Redondeado: servidor y navegador pueden diferir en el último decimal y romper la hidratación.
    const round = (n: number) => Math.round(n * 1000) / 1000;
    return [round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))];
  };
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = polar(from, r);
    const [x2, y2] = polar(to, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <figure className="flex flex-col items-center" aria-label={label}>
      <svg viewBox="0 0 120 70" width={size} height={(size * 70) / 120} aria-hidden="true">
        <path d={arc(MIN, 0.5, 54)} fill="none" stroke="var(--vermilion)" strokeOpacity="0.55" strokeWidth="3" />
        <path d={arc(0.5, MAX, 54)} fill="none" stroke="var(--verdigris)" strokeOpacity="0.7" strokeWidth="3" />
        <path d={arc(MIN, MAX, 46)} fill="none" stroke="var(--brass-dim)" strokeWidth="1" />
        {ticks.map((t, i) => {
          const major = i % 5 === 0;
          const [x1, y1] = polar(t, major ? 36 : 40);
          const [x2, y2] = polar(t, 46);
          return (
            <line
              key={t}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--brass)"
              strokeWidth={major ? 1.6 : 0.8}
            />
          );
        })}
        <g className="dial-needle" style={{ "--angle": `${angle}deg` } as React.CSSProperties}>
          <path d={`M ${cx - 2.2} ${cy} L ${cx} ${cy - 50} L ${cx + 2.2} ${cy} Z`} fill="var(--ivory)" />
        </g>
        <circle cx={cx} cy={cy} r="5" fill="var(--brass)" />
        <circle cx={cx} cy={cy} r="2" fill="var(--ox-deep)" />
      </svg>
      <figcaption className="-mt-1 text-[1.35rem] font-semibold leading-none text-ivory">{pct(value)}</figcaption>
    </figure>
  );
}
