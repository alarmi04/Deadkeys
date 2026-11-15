"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/i18n/client";
import type { AbilityRun, AbilityStat, AbilityTip } from "@/lib/api";

type Ability = { name: string; image: string; tip: AbilityTip | null };

const GAP = 12;
const MARGIN = 8;

/**
 * Fila de iconos de habilidad. Al pasar el ratón o el foco por uno aparece su ficha
 * (descripción, cifras y mejoras), como en el juego. La ficha va en un portal con
 * posición fija para que no la recorte el panel del héroe.
 */
export function AbilityList({
  abilities,
  color,
  named = false,
}: {
  abilities: Ability[];
  color: string;
  /** Muestra el nombre bajo cada icono (ficha de héroe); sin él, solo los iconos (selector). */
  named?: boolean;
}) {
  const t = useT().heroes.ability;
  const [open, setOpen] = useState<{ index: number; rect: DOMRect } | null>(null);
  const tipId = useId();

  // Hacer scroll o redimensionar deja la ficha desanclada: se cierra.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const show = (index: number, el: HTMLElement) => setOpen({ index, rect: el.getBoundingClientRect() });
  const current = open ? abilities[open.index]?.tip : null;

  return (
    <>
      <ul
        className={named ? "flex flex-wrap gap-x-10 gap-y-7" : "mt-6 flex gap-[clamp(0.9rem,1.4vw,1.6rem)]"}
        style={{ "--hero": color } as React.CSSProperties}
        aria-label={t.list}
      >
        {abilities.map((a, i) => (
          <li
            key={a.name}
            tabIndex={0}
            aria-label={a.name}
            aria-describedby={open?.index === i && a.tip ? tipId : undefined}
            className={`ability-item ${named ? "w-[7.5rem] flex-col items-center gap-3 text-center" : ""}`}
            data-open={open?.index === i || undefined}
            onMouseEnter={(e) => show(i, e.currentTarget.firstElementChild as HTMLElement)}
            onMouseLeave={() => setOpen(null)}
            onFocus={(e) => show(i, e.currentTarget.firstElementChild as HTMLElement)}
            onBlur={() => setOpen(null)}
          >
            <span className="hero-ability">
              <Image src={a.image} alt="" width={56} height={56} className="size-[58%] object-contain" />
            </span>
            {named && (
              <span className="font-barlow text-base font-bold uppercase leading-tight tracking-[0.04em] text-ivory">
                {a.name}
              </span>
            )}
          </li>
        ))}
      </ul>
      {open && current && typeof document !== "undefined" &&
        createPortal(<TipPanel id={tipId} tip={current} anchor={open.rect} color={color} />, document.body)}
    </>
  );
}

function TipPanel({ id, tip, anchor, color }: { id: string; tip: AbilityTip; anchor: DOMRect; color: string }) {
  const t = useT().heroes.ability;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Se coloca junto al icono sin salirse de la ventana.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamp = (v: number, size: number, max: number) => Math.max(MARGIN, Math.min(v, max - size - MARGIN));
    const cx = clamp(anchor.left + anchor.width / 2 - w / 2, w, vw);
    const cy = clamp(anchor.top + anchor.height / 2 - h / 2, h, vh);
    // Primera opción que cabe entera sin tapar el icono: arriba, abajo, derecha, izquierda.
    const fits = [
      { left: cx, top: anchor.top - h - GAP, ok: anchor.top - h - GAP >= MARGIN },
      { left: cx, top: anchor.bottom + GAP, ok: anchor.bottom + GAP + h <= vh - MARGIN },
      { left: anchor.right + GAP, top: cy, ok: anchor.right + GAP + w <= vw - MARGIN },
      { left: anchor.left - w - GAP, top: cy, ok: anchor.left - w - GAP >= MARGIN },
    ];
    const pick = fits.find((f) => f.ok) ?? { left: cx, top: clamp(anchor.top - h - GAP, h, vh) };
    setPos({ left: pick.left, top: pick.top });
  }, [anchor, tip]);

  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className="ability-tip"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? "visible" : "hidden",
        "--hero": color,
      } as React.CSSProperties}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-barlow text-[1.7rem] font-extrabold uppercase leading-none tracking-[0.01em] text-brass">
          {tip.name}
        </h3>
        {tip.cooldown && (
          <span className="ability-chip shrink-0" title={t.cooldown}>
            <ClockIcon />
            {tip.cooldown}
          </span>
        )}
      </header>

      {tip.range && (
        <span className="ability-chip mt-2.5" title={t.range}>
          <RangeIcon />
          {tip.range}
        </span>
      )}

      {tip.description.length > 0 && <p className="ability-desc">{tip.description.map((r, i) => <Run key={i} run={r} />)}</p>}

      {tip.key.length > 0 && (
        <div className="mt-5 flex gap-2">
          {tip.key.map((k, i) => (
            <KeyStat key={i} stat={k} />
          ))}
        </div>
      )}

      {tip.basic.length > 0 && (
        <dl className="ability-basic">
          {tip.basic.map((b, i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              <dd className="font-barlow text-[1.05rem] font-extrabold tabular-nums text-ivory">
                {b.value}
                <Scale scale={b.scale} />
              </dd>
              <dt className="min-w-0 text-[0.85rem] leading-snug text-ivory-dim">{b.label}</dt>
            </div>
          ))}
        </dl>
      )}

      {tip.tiers.length > 0 && (
        <ol className="mt-5 grid grid-cols-3 gap-2" aria-label={t.upgrades}>
          {tip.tiers.map((tier) => (
            <li key={tier.cost} className="ability-tier">
              <span className="flex items-center gap-1 font-barlow text-base font-extrabold text-brass">
                <GemIcon />
                {tier.cost}
              </span>
              <span className="text-balance text-[0.83rem] font-semibold leading-snug text-ivory">{tier.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Run({ run }: { run: AbilityRun }) {
  if ("br" in run) return <br />;
  if ("icon" in run) return <MouseIcon />;
  return run.c ? <span className={`ability-run-${run.c}`}>{run.t}</span> : <>{run.t}</>;
}

function KeyStat({ stat }: { stat: AbilityStat & { tone: "spirit" | "health" | "neutral" } }) {
  return (
    <div className="ability-key" data-tone={stat.tone}>
      <span className="relative font-barlow text-[1.7rem] font-extrabold leading-none tabular-nums text-ivory">
        {stat.value}
        <Scale scale={stat.scale} corner />
      </span>
      <span className="text-balance text-[0.78rem] font-semibold leading-snug text-ivory-dim">{stat.label}</span>
    </div>
  );
}

/** "×1,6" con el icono de lo que escala: poder espiritual o mejoras de nivel. */
function Scale({ scale, corner }: { scale?: AbilityStat["scale"]; corner?: boolean }) {
  const t = useT().heroes.ability;
  if (!scale) return null;
  return (
    <span
      className={`ability-scale ${corner ? "ability-scale-corner" : ""}`}
      data-kind={scale.kind}
      title={scale.kind === "spirit" ? t.scaleSpirit : t.scaleBoons}
    >
      {scale.kind === "spirit" ? <StarIcon /> : <ChevronsIcon />}×{scale.n}
    </span>
  );
}

/* ---------- Iconos (trazo propio, 1.6 de grosor) ---------- */

const svgProps = { viewBox: "0 0 16 16", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;

function ClockIcon() {
  return (
    <svg {...svgProps} className="size-[0.95em]">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.6V8l2.3 1.5" strokeLinecap="round" />
    </svg>
  );
}
function RangeIcon() {
  return (
    <svg {...svgProps} className="size-[0.95em]">
      <path d="M1.8 8h12.4M4.6 5 1.8 8l2.8 3M11.4 5l2.8 3-2.8 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GemIcon() {
  return (
    <svg {...svgProps} className="size-[0.85em]">
      <path d="M8 1.6 14.4 8 8 14.4 1.6 8Z" strokeLinejoin="round" />
      <path d="M8 5.2 10.8 8 8 10.8 5.2 8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[0.95em]" fill="currentColor">
      <path d="m8 1.4 1.8 4.1 4.4.4-3.3 2.9 1 4.4L8 11 4.1 13.2l1-4.4L1.8 5.9l4.4-.4Z" />
    </svg>
  );
}
function ChevronsIcon() {
  return (
    <svg {...svgProps} className="size-[0.95em]" strokeWidth={2}>
      <path d="m3.5 8.5 4.5-4.5 4.5 4.5M3.5 13l4.5-4.5 4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MouseIcon() {
  return (
    <svg {...svgProps} className="mx-0.5 inline size-[1.05em] -translate-y-px text-ivory">
      <rect x="3.6" y="1.6" width="8.8" height="12.8" rx="4.4" />
      <path d="M8 1.8v4.6M3.8 6.4h8.4" />
    </svg>
  );
}
