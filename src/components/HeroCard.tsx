"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { Dial } from "@/components/Dial";
import { useFormat, useT } from "@/i18n/client";
import type { Hero, HeroStat } from "@/lib/api";

/** Tarjeta de héroe con dial de victorias; lleva a su página. */
export function HeroCard({ stat, hero, rank }: { stat: HeroStat; hero: Hero | undefined; rank?: number }) {
  const t = useT().common.heroCard;
  const { pct } = useFormat();
  const name = hero?.name ?? t.unknown(stat.heroId);
  return (
    <li>
      <Link
        href={`/heroes/${stat.heroId}`}
        className="group flex h-full flex-col border border-brass-dim bg-ox-deep no-underline transition-colors hover:border-brass"
      >
        <div className="relative aspect-[280/300] overflow-hidden bg-[radial-gradient(circle_at_50%_70%,var(--wine-raised),var(--ox-deep)_70%)]">
          {hero?.card && (
            <Image
              src={hero.card}
              alt=""
              fill
              sizes="(min-width: 1024px) 300px, 45vw"
              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}
          {rank != null && (
            <span className="absolute left-0 top-0 bg-ox-deep/85 px-2 py-0.5 font-display text-lg text-brass">{rank}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 border-t border-brass-dim px-2 pb-2 pt-2">
          <h3 className="text-center text-base font-bold uppercase tracking-[0.08em] text-ivory group-hover:text-brass">{name}</h3>
          <Dial value={stat.winRate} size={90} label={t.winsLabel(name, pct(stat.winRate))} />
          <p className="text-xs text-ivory-dim">
            {t.pick} {pct(stat.pickRate)}
          </p>
        </div>
      </Link>
    </li>
  );
}
