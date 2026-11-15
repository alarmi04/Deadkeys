"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useState } from "react";
import type { HeroShowcase, HeroStat } from "@/lib/api";
import { useFormat, useT } from "@/i18n/client";
import { AbilityList } from "./AbilityList";

export type SelectRow = { hero: HeroShowcase; stat: HeroStat; winRank: number };

/** Quita tildes y mayúsculas para que "Dynamo" y "dýnamo" coincidan. */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Ligera inclinación alterna de las etiquetas, como pegatinas. */
const TILT = ["-2.5deg", "1.8deg", "-1deg", "2.2deg"];

/**
 * Pantalla de selección de héroe: rejilla de retratos a la izquierda y el héroe
 * destacado a la derecha. Pasar el ratón o el foco por un retrato lo destaca;
 * hacer clic abre su ficha.
 */
export function HeroSelect({
  rows,
  total,
  sort,
  sorts,
  sample,
}: {
  rows: SelectRow[];
  total: number;
  sort: string;
  sorts: { key: string; label: string }[];
  sample: string;
}) {
  const t = useT().heroes.list;
  const { pct } = useFormat();
  const [activeId, setActiveId] = useState(rows[0]?.hero.id);
  const [q, setQ] = useState("");
  const needle = norm(q);
  const matches = (r: SelectRow) => !needle || norm(r.hero.name).includes(needle);
  const matchCount = needle ? rows.filter(matches).length : rows.length;
  const active = rows.find((r) => r.hero.id === activeId) ?? rows[0];

  return (
    <div className="hero-select-shell">
      <Webs />

      <section className="relative z-10 flex min-w-0 flex-col px-4 pb-10 pt-8 sm:px-10 lg:pl-[clamp(2rem,3.4vw,4.2rem)] lg:pr-6 lg:pt-[clamp(2rem,4.6vh,3.4rem)]">
        <h1 className="font-barlow text-[clamp(2.1rem,1.4rem+1.9vw,3.1rem)] font-extrabold uppercase leading-none tracking-[0.01em] text-brass">
          {t.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div role="search" className="flex h-9 w-full max-w-[15rem] items-stretch border-2 border-brass-dim bg-ox-deep transition-colors focus-within:border-brass">
            <label htmlFor="hero-q" className="sr-only">
              {t.searchLabel}
            </label>
            <input
              id="hero-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={t.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-3 font-barlow text-base font-semibold uppercase tracking-[0.06em] text-ivory caret-brass outline-none! placeholder:text-ivory-dim"
            />
          </div>
          <nav aria-label={t.sortLabel} className="flex items-center gap-1 font-barlow text-sm font-bold uppercase tracking-[0.08em]">
            <span className="mr-1.5 text-ivory-dim">{t.sortLabel}</span>
            {sorts.map((s) => (
              <Link
                key={s.key}
                href={`/heroes?orden=${s.key}`}
                scroll={false}
                aria-current={s.key === sort ? "true" : undefined}
                className={`px-2.5 py-1 no-underline transition-colors ${
                  s.key === sort ? "bg-brass text-ox-deep" : "text-ivory-dim hover:bg-wine hover:text-ivory"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-2 text-xs text-brass" aria-live="polite">
          {needle ? t.countOf(matchCount, rows.length) : ""}
          {sample}
        </p>

        {needle && matchCount === 0 && (
          <p className="mt-6 text-ivory-dim">{t.noMatch(q.trim())}</p>
        )}

        <ol className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(4.6rem,1fr))] lg:max-w-[47rem] lg:grid-cols-[repeat(auto-fill,minmax(clamp(3.6rem,3.9vw,4.6rem),1fr))] lg:gap-[0.55rem]">
          {rows.map((r) => {
            const on = r.hero.id === active?.hero.id;
            const hit = matches(r);
            return (
              <li key={r.hero.id} className={hit ? "" : "opacity-20 grayscale"}>
                <Link
                  href={`/heroes/${r.hero.id}`}
                  onMouseEnter={() => setActiveId(r.hero.id)}
                  onFocus={() => setActiveId(r.hero.id)}
                  aria-label={t.tileAria(r.hero.name, pct(r.stat.winRate))}
                  data-on={on || undefined}
                  className="hero-tile group block no-underline"
                  style={{ "--hero": r.hero.color } as React.CSSProperties}
                >
                  <span className="relative block aspect-[3/5] overflow-hidden">
                    {r.hero.vertical && (
                      <Image
                        src={r.hero.vertical}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover transition-[filter] duration-200 group-hover:brightness-110"
                      />
                    )}
                  </span>
                  {/* Sin panel destacado en pantallas estrechas: el dato va bajo el retrato. */}
                  <span className="block truncate px-0.5 pt-1 text-center font-barlow text-[0.7rem] font-bold uppercase leading-tight text-ivory-dim lg:hidden">
                    {r.hero.name}
                    <span className="block font-semibold text-brass">{pct(r.stat.winRate)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {active && <Stage row={active} total={total} />}
    </div>
  );
}

function Stage({ row, total }: { row: SelectRow; total: number }) {
  const t = useT().heroes.list;
  const { pct, num, compact } = useFormat();
  const { hero, stat, winRank } = row;
  return (
    <aside
      aria-label={t.featured(hero.name)}
      className="hero-stage hidden overflow-hidden lg:block"
      style={{ "--hero": hero.color } as React.CSSProperties}
    >
      {/* Franja de color del héroe, detrás del fondo ilustrado */}
      <div aria-hidden="true" className="hero-stage-slab absolute inset-0" />
      {hero.background && (
        <div key={`bg-${hero.id}`} aria-hidden="true" className="hero-stage-bg absolute inset-0">
          <Image src={hero.background} alt="" fill sizes="62vw" className="object-cover object-right" />
        </div>
      )}
      <div
        key={`portrait-${hero.id}`}
        aria-hidden="true"
        data-size={hero.portrait.size}
        className="hero-stage-figure absolute"
      >
        <div className="deco-frame hero-portrait-frame">
          <Image src={hero.portrait.src} alt="" fill unoptimized priority className="object-cover object-top" />
        </div>
      </div>

      <div key={`info-${hero.id}`} className="hero-stage-info absolute flex flex-col items-end">
        <dl className="mb-4 flex gap-6 font-barlow uppercase text-ivory [text-shadow:0_1px_2px_rgb(0_0_0/0.95),0_2px_12px_rgb(0_0_0/0.85)]">
          <Fact label={t.facts.wins} value={pct(stat.winRate)} />
          <Fact label={t.facts.pick} value={pct(stat.pickRate)} />
          <Fact label={t.facts.rank} value={`${winRank}/${total}`} />
          <Fact label={t.facts.matches} value={compact(stat.matches)} />
        </dl>

        <h2 className="w-full">
          {hero.nameImage ? (
            <Image
              src={hero.nameImage}
              alt={hero.name}
              width={1561}
              height={376}
              unoptimized
              className="ml-auto h-auto max-h-[clamp(4rem,11vh,7.5rem)] w-auto max-w-full drop-shadow-[0_6px_14px_rgb(0_0_0/0.55)]"
            />
          ) : (
            <span className="block text-right font-barlow text-7xl font-extrabold uppercase text-ivory">{hero.name}</span>
          )}
        </h2>

        {hero.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap justify-end gap-x-4 gap-y-2">
            {hero.tags.map((t, i) => (
              <li
                key={t}
                className="hero-tag font-barlow text-[clamp(1.2rem,0.9rem+0.7vw,1.7rem)] font-extrabold uppercase leading-none"
                style={{ rotate: TILT[i % TILT.length], translate: `0 ${i % 2 ? 6 : 0}px` }}
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        {hero.abilities.length > 0 && <AbilityList key={hero.id} abilities={hero.abilities} color={hero.color} />}

        <Link
          href={`/heroes/${hero.id}`}
          className="mt-6 inline-flex items-center gap-2 bg-brass px-4 py-2 font-barlow text-base font-extrabold uppercase tracking-[0.08em] text-ox-deep no-underline transition-colors hover:bg-ivory"
        >
          {t.viewSheet(hero.name)}
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
            <path d="M3 8h9M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </Link>
      </div>
      <p className="sr-only">
        {t.sr(hero.name, pct(stat.winRate), pct(stat.pickRate), num(stat.matches))}
      </p>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right" aria-hidden="true">
      <dt className="text-xs font-bold tracking-[0.12em] text-ivory">{label}</dt>
      <dd className="text-2xl font-extrabold leading-none">{value}</dd>
    </div>
  );
}

/** Telaraña de líneas finas del fondo, como en la pantalla del juego. */
function Webs() {
  const lines = [
    "M-50 980 L620 -40", "M-50 980 L1100 120", "M-50 980 L900 1100", "M-50 980 L1300 640",
    "M220 1100 L760 -40", "M380 1100 L40 -40", "M-50 420 L980 1100", "M-50 240 L1200 900",
  ];
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1300 1000" preserveAspectRatio="xMinYMid slice">
      <g stroke="var(--brass)" strokeOpacity="0.09" strokeWidth="1.2" fill="none">
        {lines.map((d) => (
          <path key={d} d={d} />
        ))}
        <path d="M120 760 Q 260 640 330 470 Q 420 640 600 700 Q 420 760 330 960 Q 260 800 120 760Z" />
        <path d="M40 820 Q 230 650 330 330 Q 470 650 760 720 Q 470 820 330 1080 Q 220 860 40 820Z" />
      </g>
    </svg>
  );
}
