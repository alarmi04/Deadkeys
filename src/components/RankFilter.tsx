import Image from "next/image";
import { FilterLink } from "@/components/BuildFilters";
import type { Rank } from "@/lib/api";
import { getT } from "@/i18n/server";

/** Chips de rango. `hrefFor(null)` es "todos los rangos"; cada página decide a qué URL lleva cada uno. */
export async function RankFilter({
  ranks,
  tier,
  hrefFor,
}: {
  ranks: Rank[];
  tier: number | null;
  hrefFor: (tier: number | null) => string;
}) {
  const t = (await getT()).common;
  const chip = (active: boolean) =>
    `flex h-9 items-center gap-1.5 border px-2.5 text-xs font-semibold uppercase tracking-[0.1em] no-underline transition-colors ${
      active ? "border-brass bg-brass text-ox-deep" : "border-brass-dim text-ivory-dim hover:border-brass hover:text-ivory"
    }`;
  return (
    <nav aria-label={t.rank} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="w-16 text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">{t.rank}</span>
      <ul className="flex flex-wrap gap-1.5">
        <li>
          <FilterLink href={hrefFor(null)} current={tier === null} className={chip(tier === null)}>
            {t.all}
          </FilterLink>
        </li>
        {ranks.map((r) => {
          const img = r.images.large_webp ?? r.images.large;
          return (
            <li key={r.tier}>
              <FilterLink href={hrefFor(r.tier)} current={tier === r.tier} className={chip(tier === r.tier)}>
                {img && <Image src={img} alt="" width={22} height={22} className="size-[22px] object-contain" />}
                {r.name}
              </FilterLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
