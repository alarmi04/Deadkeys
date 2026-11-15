"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useState } from "react";
import { useFormat, useT } from "@/i18n/client";
import { type MatchupItem, PHASES, liftSign, liftTone } from "@/lib/matchup";

const PER_PHASE = 6;
const WORST = 5;

/** Diferencia en puntos con signo: +1,2 / −0,8. */
export function useSigned() {
  const { num } = useFormat();
  return (v: number) => `${liftSign(v)}${num(Math.abs(v * 100), 1)}`;
}

/** Objetos del cruce por fase de la partida, ordenables por % de victorias o por ventaja contra el rival. */
export function MatchupItems({ rows, enemy }: { rows: MatchupItem[]; enemy: string }) {
  const t = useT().matchup.items;
  const [sort, setSort] = useState<"win" | "lift">("win");
  const by = sort === "win" ? (x: MatchupItem, y: MatchupItem) => y.winRate - x.winRate : (x: MatchupItem, y: MatchupItem) => y.lift - x.lift;
  const worst = [...rows].sort((x, y) => x.lift - y.lift).filter((r) => r.lift < 0).slice(0, WORST);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2 font-barlow text-sm font-bold uppercase tracking-[0.08em]" role="group" aria-label={t.sortLabel}>
        <span className="mr-1.5 text-ivory-dim">{t.sortLabel}</span>
        {(["win", "lift"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={sort === k}
            onClick={() => setSort(k)}
            className={`px-2.5 py-1 transition-colors ${sort === k ? "bg-brass text-ox-deep" : "text-ivory-dim hover:bg-wine hover:text-ivory"}`}
          >
            {k === "win" ? t.sortWin : t.sortLift(enemy)}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-10 lg:grid-cols-3">
        {PHASES.map((phase) => {
          const list = rows.filter((r) => r.phase === phase).sort(by).slice(0, PER_PHASE);
          return (
            <section key={phase} aria-labelledby={`phase-${phase}`}>
              <h3 id={`phase-${phase}`} className="flex items-baseline justify-between gap-3 border-b border-brass-dim pb-2">
                <span className="font-barlow text-2xl font-extrabold uppercase tracking-[0.04em] text-brass">{t.phases[phase]}</span>
                <span className="text-xs text-ivory-dim">{t.phaseCost[phase]}</span>
              </h3>
              {list.length === 0 ? (
                <p className="mt-4 text-sm text-ivory-dim">{t.none}</p>
              ) : (
                <ol>
                  <li aria-hidden="true" className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] gap-x-3 pt-2 text-right font-barlow text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ivory-dim">
                    <span className="col-start-3 w-[4.2rem]">{t.colWin}</span>
                    <span className="w-[4.6rem]">{t.colLift(enemy)}</span>
                  </li>
                  {list.map((r) => (
                    <ItemRow key={r.id} row={r} enemy={enemy} emphasis={sort} />
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>

      {worst.length > 0 && (
        <section aria-labelledby="worst-items" className="mt-12 max-w-[42rem]">
          <h3 id="worst-items" className="font-barlow text-2xl font-extrabold uppercase tracking-[0.04em] text-brass">
            {t.worstTitle(enemy)}
          </h3>
          <p className="mt-1 text-sm text-ivory-dim">{t.worstIntro(enemy)}</p>
          <ol className="mt-2">
            {worst.map((r) => (
              <ItemRow key={r.id} row={r} enemy={enemy} emphasis="lift" />
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function ItemRow({ row, enemy, emphasis }: { row: MatchupItem; enemy: string; emphasis: "win" | "lift" }) {
  const t = useT().matchup;
  const { pct, num, compact } = useFormat();
  const signed = useSigned();
  const lift = signed(row.lift);
  return (
    <li className="border-b border-wine-raised">
      <Link
        href={`/objetos/${row.id}`}
        className="duel-item grid grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 py-2.5 no-underline"
      >
        <span className="duel-item-icon" data-slot={row.slot ?? undefined}>
          {row.image && <Image src={row.image} alt="" width={40} height={40} unoptimized className="size-full object-contain" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ivory">{row.name}</span>
          <span className="block text-xs text-ivory-dim">
            {t.items.buyAt(num(row.buyMinute))} · {t.items.matches(compact(row.matches))}
          </span>
        </span>
        <span
          className={`w-[4.2rem] text-right font-barlow text-xl font-extrabold leading-none ${emphasis === "win" ? "text-ivory" : "text-ivory-dim"}`}
          title={t.items.colWin}
        >
          {pct(row.winRate)}
        </span>
        <span
          className={`w-[4.6rem] text-right font-barlow text-lg font-bold leading-none ${liftTone(row.lift)}`}
          title={t.items.liftTitle(enemy, lift)}
        >
          {lift}
          <span className="sr-only"> {t.pts}</span>
        </span>
      </Link>
    </li>
  );
}
