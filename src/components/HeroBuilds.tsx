import { type BrowserBadge, type BrowserHero, type BrowserItem, BuildBrowser } from "@/components/BuildBrowser";
import { FilterLink, FilterResults, FilterScope, PendingNote } from "@/components/BuildFilters";
import { RankFilter } from "@/components/RankFilter";
import { Unavailable } from "@/components/Unavailable";
import {
  type Item,
  type Rank,
  getBuildStats,
  getBuilds,
  getPlayerNames,
  getPlayerRanks,
  getRanks,
  rankImage,
  safe,
} from "@/lib/api";
import { getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";

const PAGE = 20;
const MAX = 80;
/** Con filtro de rango del autor se examinan las builds más jugadas hasta este tope (igual que en /builds). */
const CANDIDATES = 250;
const ROMAN_SUB = ["", "I", "II", "III", "IV", "V", "VI"];

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

  const [ranks, stats] = await Promise.all([safe(getRanks()), safe(getBuildStats(hero.id, null))]);
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
        <Results f={f} stats={stats} hero={hero} items={items} rankName={rank?.name ?? null} allRanks={rankOptions} href={href} />
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
  allRanks,
  href,
}: {
  f: Filters;
  stats: Awaited<ReturnType<typeof getBuildStats>> | null;
  hero: BrowserHero;
  items: Item[] | null;
  rankName: string | null;
  allRanks: Rank[];
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

  // Sin rango solo se cargan las builds visibles; con él, las candidatas más jugadas y se filtra por el rango del autor.
  const pool = f.tier === null ? stats.builds.slice(0, Math.min(MAX, f.n + 1)) : stats.builds.slice(0, CANDIDATES);
  const detailById = await getBuilds(pool.map((b) => b.buildId));
  const authorIds = [...detailById.values()].map((d) => d.authorId);
  const [names, ranks] = await Promise.all([safe(getPlayerNames(authorIds)), safe(getPlayerRanks(authorIds))]).then(
    ([n, r]) => [n ?? {}, r ?? {}] as const,
  );
  const badges: Record<number, BrowserBadge> = {};
  for (const [id, r] of Object.entries(ranks)) {
    const info = allRanks.find((x) => x.tier === r.tier);
    const img = info?.images[`large_subrank${r.subrank}_webp`] ?? info?.images[`large_subrank${r.subrank}`] ?? rankImage(allRanks, r.tier, r.subrank);
    if (img && info?.name) badges[Number(id)] = { image: img, label: `${info.name} ${ROMAN_SUB[r.subrank] ?? r.subrank}` };
  }

  const matching =
    f.tier === null
      ? stats.builds
      : pool.filter((b) => {
          const d = detailById.get(b.buildId);
          return d !== undefined && ranks[d.authorId]?.tier === f.tier;
        });
  if (matching.length === 0) {
    return (
      <p className="mt-6 max-w-[64ch] text-ivory-dim">
        {t.noneForRank(num(pool.length), hero.name, rankName ?? "")}{" "}
        <FilterLink href={href({ tier: null, build: null, n: PAGE })} className="text-brass underline">
          {t.allRanks}
        </FilterLink>
        .
      </p>
    );
  }

  const shown = matching.slice(0, f.n);
  const selected = matching.find((b) => b.buildId === f.build) ?? shown[0];
  const list = shown.some((b) => b.buildId === selected.buildId) ? shown : [selected, ...shown];

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

  const rest = matching.length - shown.length;
  return (
    <>
      <p className="mt-4 text-sm text-ivory-dim">
        {f.tier === null
          ? t.heroBuildsSummary(num(stats.builds.length), date(stats.since), scope)
          : t.summaryRank(num(matching.length), rankName ?? "", num(pool.length), date(stats.since))}
      </p>
      <BuildBrowser
        key={`${hero.id}-${f.tier}`}
        rows={list.map((b) => {
          const d = detailById.get(b.buildId) ?? null;
          return {
            stat: b,
            detail: d,
            author: d ? (names[d.authorId] ?? null) : null,
            badge: d ? (badges[d.authorId] ?? null) : null,
          };
        })}
        initialId={selected.buildId}
        heroes={{ [hero.id]: hero }}
        items={itemMap}
        tier={null}
        rankName={null}
        moreHref={rest > 0 && f.n < MAX ? href({ n: f.n + PAGE, build: null }) : null}
        moreCount={Math.min(PAGE, rest)}
      />
    </>
  );
}
