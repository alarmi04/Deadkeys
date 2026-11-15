import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "@/components/Link";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RedirectSharedList, TierTabs, UseAsBase } from "@/components/TierActions";
import { Unavailable } from "@/components/Unavailable";
import { type Hero, type HeroStat, type Rank, getHeroStats, getHeroes, getRanks, safe } from "@/lib/api";
import { type Row, tierTone } from "@/lib/tierlist";

export async function generateMetadata({ params }: PageProps<"/[lang]/herramientas/tierlist">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).tierlist;
  return pageMeta({ lang, path: "/herramientas/tierlist", title: t.metaTitle, description: t.metaDesc });
}

const BASE = "/herramientas/tierlist";

/** Con menos partidas que esto, el % de victorias se mueve demasiado por azar para clasificar con él. */
const MIN_SAMPLE = 500;

/** Cortes por % de victorias: cada fila empieza en su mínimo. La última recoge todo lo que queda por debajo. */
const TIERS = [
  { label: "S", min: 0.54 },
  { label: "A", min: 0.52 },
  { label: "B", min: 0.5 },
  { label: "C", min: 0.48 },
  { label: "D", min: 0 },
] as const;

export default async function TierListPage({ searchParams }: PageProps<"/[lang]/herramientas/tierlist">) {
  const t = (await getT()).tierlist;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />
      <RedirectSharedList />
      <TierTabs />
      <Suspense fallback={<LoadingState label={t.loading} className="mt-8" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Board({ searchParams }: { searchParams: PageProps<"/[lang]/herramientas/tierlist">["searchParams"] }) {
  const t = (await getT()).tierlist;
  const { compact, date, num } = await getFormat();
  const sp = await searchParams;
  const n = typeof sp.rango === "string" ? Number(sp.rango) : NaN;
  const tier = Number.isInteger(n) && n >= 1 && n <= 11 ? n : null;

  const [heroes, stats, ranks] = await Promise.all([safe(getHeroes()), safe(getHeroStats(tier)), safe(getRanks())]);
  const rankOptions = (ranks ?? []).filter((r) => r.tier > 0).sort((a, b) => a.tier - b.tier);

  if (!heroes || !stats) {
    return (
      <div className="mt-8">
        <Unavailable what={t.what} />
      </div>
    );
  }

  const byId = new Map(heroes.filter((h) => h.playable).map((h) => [h.id, h]));
  const known = stats.stats.filter((s) => byId.has(s.heroId));
  const enough = known.filter((s) => s.matches >= MIN_SAMPLE);
  const few = known.filter((s) => s.matches < MIN_SAMPLE);

  // Cada héroe cae en la primera fila cuyo corte alcanza; dentro de la fila, de más a menos victorias.
  const groups = TIERS.map((tr, i) => ({
    ...tr,
    stats: enough
      .filter((s) => s.winRate >= tr.min && (i === 0 || s.winRate < TIERS[i - 1].min))
      .sort((a, b) => b.winRate - a.winRate),
  }));
  const rows: Row[] = groups.map((g) => ({ label: g.label, heroes: g.stats.map((s) => s.heroId) }));
  const rank = rankOptions.find((r) => r.tier === tier);

  return (
    <>
      {rankOptions.length > 0 && <RankLinks ranks={rankOptions} tier={tier} />}

      <p className="mt-6 max-w-[78ch] text-sm text-ivory-dim">
        {t.summary(date(stats.since), rank ? t.scopeRank(rank.name) : t.scopeAll, compact(stats.totalMatches))}
      </p>

      <ol className="tier-board mt-5" aria-label={t.boardAria(rank?.name ?? null)}>
        {groups.map((g, i) => (
          <li key={g.label} className="tier-row">
            <div className="tier-label" style={tierTone(i, groups.length)}>
              <div className="text-center">
                <span className="block font-display text-[2.1rem] font-bold leading-none">{g.label}</span>
                <span className="mt-1 block text-[0.7rem] font-semibold tracking-wide">
                  {g.min > 0 ? `≥ ${num(g.min * 100)}%` : `< ${num(TIERS[i - 1].min * 100)}%`}
                </span>
              </div>
            </div>
            <ul className="tier-heroes" aria-label={t.rowAria(g.label)}>
              {g.stats.map((s) => (
                <HeroTile key={s.heroId} hero={byId.get(s.heroId)!} stat={s} />
              ))}
            </ul>
            <span />
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <UseAsBase rows={rows} />
        <p className="text-sm text-ivory-dim">{t.copyToEditor}</p>
      </div>

      {few.length > 0 && (
        <p className="mt-6 max-w-[78ch] text-sm text-ivory-dim">
          {t.fewData(MIN_SAMPLE, few.map((s) => byId.get(s.heroId)!.name).join(", "))}
        </p>
      )}
    </>
  );
}

async function HeroTile({ hero, stat }: { hero: Hero; stat: HeroStat }) {
  const t = (await getT()).tierlist;
  const { num } = await getFormat();
  const wr = num(stat.winRate * 100, 1);
  return (
    <li className="tier-tile">
      <Link
        href={`/heroes/${hero.id}`}
        aria-label={t.heroTileAria(hero.name, `${wr}%`, num(stat.matches))}
        title={t.heroTileTitle(hero.name, `${wr}%`, num(stat.matches))}
      >
        {hero.small ? (
          <Image src={hero.small} alt="" width={68} height={68} />
        ) : (
          <span className="block size-full bg-wine" />
        )}
        <span className="tier-wr" data-good={stat.winRate >= 0.5 || undefined}>
          {wr}
        </span>
      </Link>
    </li>
  );
}

/** Chips de rango: cada uno recarga la página con las estadísticas de ese rango. */
async function RankLinks({ ranks, tier }: { ranks: Rank[]; tier: number | null }) {
  const c = (await getT()).common;
  const chip = (active: boolean) =>
    `flex h-9 items-center gap-1.5 border px-2.5 text-xs font-semibold uppercase tracking-[0.1em] no-underline transition-colors ${
      active ? "border-brass bg-brass text-ox-deep" : "border-brass-dim text-ivory-dim hover:border-brass hover:text-ivory"
    }`;
  return (
    <nav aria-label={c.rank} className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="w-16 text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">{c.rank}</span>
      <ul className="flex flex-wrap gap-1.5">
        <li>
          <Link href={BASE} scroll={false} aria-current={tier === null ? "true" : undefined} className={chip(tier === null)}>
            {c.all}
          </Link>
        </li>
        {ranks.map((r) => {
          const img = r.images.large_webp ?? r.images.large;
          return (
            <li key={r.tier}>
              <Link
                href={`${BASE}?rango=${r.tier}`}
                scroll={false}
                aria-current={tier === r.tier ? "true" : undefined}
                className={chip(tier === r.tier)}
              >
                {img && <Image src={img} alt="" width={22} height={22} className="size-[22px] object-contain" />}
                {r.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
