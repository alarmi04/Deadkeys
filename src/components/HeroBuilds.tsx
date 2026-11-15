import { type BrowserHero, type BrowserItem, BuildBrowser } from "@/components/BuildBrowser";
import { FilterLink, FilterResults, FilterScope, PendingNote } from "@/components/BuildFilters";
import { RankFilter } from "@/components/RankFilter";
import { Unavailable } from "@/components/Unavailable";
import { type BuildDetail, type Item, getBuild, getBuildStats, getPlayerNames, getRanks, safe } from "@/lib/api";
import { getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";

const PAGE = 20;
const MAX = 80;

type Filters = { tier: number | null; build: number | null; n: number };

function int(v: string | string[] | undefined): number | null {
  const n = typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Builds de la comunidad de un héroe: mismo explorador que /builds, ya filtrado por héroe y con filtro de rango. */
export async function HeroBuilds({
  hero,
  items,
  searchParams,
}: {
  hero: BrowserHero;
  items: Item[] | null;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawTier = int(sp.rango);
  const tier = rawTier !== null && rawTier >= 1 && rawTier <= 11 ? rawTier : null;
  const f: Filters = { tier, build: int(sp.build), n: Math.min(MAX, Math.max(PAGE, int(sp.n) ?? PAGE)) };

  const [ranks, stats] = await Promise.all([safe(getRanks()), safe(getBuildStats(hero.id, tier))]);
  const rankOptions = (ranks ?? []).filter((r) => r.tier > 0).sort((a, b) => a.tier - b.tier);
  const rank = rankOptions.find((r) => r.tier === tier) ?? null;

  const href = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    const q = new URLSearchParams();
    if (next.tier !== null) q.set("rango", String(next.tier));
    if (next.n !== PAGE) q.set("n", String(next.n));
    if (next.build !== null) q.set("build", String(next.build));
    const s = q.toString();
    return `/heroes/${hero.id}${s ? `?${s}` : ""}#builds`;
  };

  return (
    <FilterScope>
      <div className="mt-6 flex flex-col gap-3 border-y border-brass-dim py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <RankFilter ranks={rankOptions} tier={tier} hrefFor={(t) => href({ tier: t, build: null, n: PAGE })} />
          <PendingNote />
        </div>
      </div>
      <FilterResults>
        <Results f={f} stats={stats} hero={hero} items={items} rankName={rank?.name ?? null} href={href} />
      </FilterResults>
    </FilterScope>
  );
}

async function Results({
  f,
  stats,
  hero,
  items,
  rankName,
  href,
}: {
  f: Filters;
  stats: Awaited<ReturnType<typeof getBuildStats>> | null;
  hero: BrowserHero;
  items: Item[] | null;
  rankName: string | null;
  href: (patch: Partial<Filters>) => string;
}) {
  const t = (await getT()).builds;
  const { date, num } = await getFormat();
  if (!stats) {
    return (
      <div className="mt-6">
        <Unavailable what={t.what} />
      </div>
    );
  }
  const scope = rankName ? t.scopeRank(rankName) : t.scopeAll;
  if (stats.builds.length === 0) {
    return (
      <p className="mt-6 max-w-[64ch] text-ivory-dim">
        {t.heroBuildsNone(hero.name, scope)}
        {f.tier !== null && (
          <>
            {" "}{t.tryWith}{" "}
            <FilterLink href={href({ tier: null, build: null, n: PAGE })} className="text-brass underline">
              {t.allRanks}
            </FilterLink>
            .
          </>
        )}
      </p>
    );
  }

  const shown = stats.builds.slice(0, f.n);
  const selected = stats.builds.find((b) => b.buildId === f.build) ?? shown[0];
  const list = shown.some((b) => b.buildId === selected.buildId) ? shown : [selected, ...shown];

  const details = await Promise.all(list.map((b) => safe(getBuild(b.buildId))));
  const detailById = new Map(details.filter((d): d is BuildDetail => !!d).map((d) => [d.id, d]));
  const names = (await safe(getPlayerNames([...detailById.values()].map((d) => d.authorId)))) ?? {};

  const itemMap: Record<number, BrowserItem> = {};
  for (const i of items ?? []) {
    if (i.type !== "upgrade") continue;
    itemMap[i.id] = {
      name: i.name,
      image: i.image,
      slot: i.slot,
      tier: i.tier,
      upgrade: true,
      cost: i.cost,
      quip: i.quip,
      inShop: i.inShop,
    };
  }

  const rest = stats.builds.length - shown.length;
  return (
    <>
      <p className="mt-4 text-sm text-ivory-dim">
        {t.heroBuildsSummary(num(stats.builds.length), date(stats.since), scope)}
      </p>
      <BuildBrowser
        key={`${hero.id}-${f.tier}`}
        rows={list.map((b) => {
          const d = detailById.get(b.buildId) ?? null;
          return { stat: b, detail: d, author: d ? (names[d.authorId] ?? null) : null };
        })}
        initialId={selected.buildId}
        heroes={{ [hero.id]: hero }}
        items={itemMap}
        tier={f.tier}
        rankName={rankName}
        moreHref={rest > 0 && f.n < MAX ? href({ n: f.n + PAGE, build: null }) : null}
        moreCount={Math.min(PAGE, rest)}
      />
    </>
  );
}
