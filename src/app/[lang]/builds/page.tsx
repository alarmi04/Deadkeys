import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import { Suspense } from "react";
import { RankFilter } from "@/components/RankFilter";
import { type BrowserBadge, type BrowserHero, type BrowserItem, BuildBrowser } from "@/components/BuildBrowser";
import { FilterLink, FilterResults, FilterScope, HeroCombobox, PendingNote } from "@/components/BuildFilters";
import { PageHeader } from "@/components/PageHeader";
import { Unavailable } from "@/components/Unavailable";
import {
  type Rank,
  getBuildStats,
  getBuilds,
  getHeroStats,
  getHeroes,
  getItems,
  getPlayerNames,
  getPlayerRanks,
  getRanks,
  rankImage,
  safe,
} from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/builds">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).builds;
  return pageMeta({ lang, path: "/builds", title: t.metaTitle, description: t.metaDesc });
}

const ROMAN_SUB = ["", "I", "II", "III", "IV", "V", "VI"];
const PAGE = 30;
const MAX = 90;
/** Por debajo de este número de partidas el porcentaje es ruido: al ordenar por victorias van al final. */
const MIN_MATCHES = 20;

type Sort = "partidas" | "winrate";
type Filters = { hero: number | null; tier: number | null; build: number | null; n: number; sort: Sort };

function sortBuilds<T extends { matches: number; winRate: number }>(list: T[], sort: Sort): T[] {
  if (sort === "partidas") return list;
  const solid = (b: T) => (b.matches >= MIN_MATCHES ? 1 : 0);
  return [...list].sort((a, b) => solid(b) - solid(a) || b.winRate - a.winRate || b.matches - a.matches);
}

function int(v: string | string[] | undefined): number | null {
  const n = typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function href(f: Filters, patch: Partial<Filters>): string {
  const next = { ...f, ...patch };
  const q = new URLSearchParams();
  if (next.hero !== null) q.set("heroe", String(next.hero));
  if (next.tier !== null) q.set("rango", String(next.tier));
  if (next.sort !== "partidas") q.set("orden", next.sort);
  if (next.n !== PAGE) q.set("n", String(next.n));
  if (next.build !== null) q.set("build", String(next.build));
  const s = q.toString();
  return `/builds${s ? `?${s}` : ""}`;
}

export default async function BuildsPage({ searchParams }: PageProps<"/[lang]/builds">) {
  const t = (await getT()).builds;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<Skeleton />}>
        <BuildsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BuildsView({ searchParams }: { searchParams: PageProps<"/[lang]/builds">["searchParams"] }) {
  const m = await getT();
  const t = m.builds;
  const sp = await searchParams;
  const heroParam = int(sp.heroe);
  const tierParam = int(sp.rango) !== null && int(sp.rango)! >= 1 && int(sp.rango)! <= 11 ? int(sp.rango) : null;

  const f: Filters = { hero: heroParam, tier: tierParam, build: int(sp.build), n: Math.min(MAX, Math.max(PAGE, int(sp.n) ?? PAGE)), sort: sp.orden === "winrate" ? "winrate" : "partidas" };

  // Las builds y su detalle se piden ya, en paralelo con lo que necesitan los filtros: los filtros se
  // muestran en cuanto llegan héroes y rangos, y la lista entra después en su propio Suspense.
  const stats = safe(getBuildStats(heroParam, tierParam));
  const rows = stats.then((s) => (s && s.builds.length > 0 ? loadRows(s, f) : null));
  const items = safe(getItems(m.lang));
  const [heroes, ranks, heroStats] = await Promise.all([safe(getHeroes()), safe(getRanks()), safe(getHeroStats())]);

  const playable = new Set(heroStats?.stats.map((s) => s.heroId));
  const heroOptions: BrowserHero[] = (heroes ?? [])
    .filter((h) => playable.size === 0 || playable.has(h.id) || h.id === heroParam)
    .sort((a, b) => a.name.localeCompare(b.name, m.lang))
    .map((h) => ({ id: h.id, name: h.name, small: h.small }));
  const rankOptions = (ranks ?? []).filter((r) => r.tier > 0).sort((a, b) => a.tier - b.tier);

  const heroById = Object.fromEntries((heroes ?? []).map((h) => [h.id, { id: h.id, name: h.name, small: h.small }]));
  const rank = rankOptions.find((r) => r.tier === f.tier) ?? null;

  return (
    <FilterScope>
      <div className="mt-8 flex flex-col gap-4 border-y border-brass-dim py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <HeroCombobox key={f.hero ?? "todos"} heroes={heroOptions} value={f.hero} tier={f.tier} />
          <PendingNote />
        </div>
        <RankFilter
          ranks={rankOptions}
          tier={f.tier}
          hrefFor={(tier) => href(f, { tier, build: null, n: PAGE })}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="w-16 text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">{t.sortLabel}</span>
          <nav aria-label={t.sortAria} className="flex flex-wrap gap-1.5">
            {([["partidas", t.sortPlayed], ["winrate", t.sortWinrate]] as const).map(([value, label]) => (
              <FilterLink
                key={value}
                href={href(f, { sort: value, build: null, n: PAGE })}
                current={f.sort === value}
                className={`border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] no-underline transition-colors ${
                  f.sort === value
                    ? "border-brass bg-brass text-ox-deep"
                    : "border-brass-dim text-ivory-dim hover:border-brass hover:text-ivory"
                }`}
              >
                {label}
              </FilterLink>
            ))}
          </nav>
        </div>
      </div>

      <FilterResults>
        <Suspense fallback={<ListSkeleton label={t.loading} />}>
          <Results f={f} stats={stats} rows={rows} heroById={heroById} items={items} rank={rank} allRanks={rankOptions} />
        </Suspense>
      </FilterResults>
    </FilterScope>
  );
}

type Stats = Awaited<ReturnType<typeof getBuildStats>>;
type Rows = Awaited<ReturnType<typeof loadRows>>;

/**
 * Detalle de las builds visibles y nombre y rango de sus autores (no lanza: lo que falla queda fuera).
 * El filtro de rango (rango medio de la partida) ya lo aplica la API, así que solo se piden las builds
 * que se muestran: en Workers gratis cada visita admite 50 subpeticiones y cada build es una.
 */
async function loadRows(stats: Stats, f: Filters) {
  const ordered = sortBuilds(stats.builds, f.sort);
  const ids = ordered.slice(0, Math.min(MAX, f.n + 1)).map((b) => b.buildId);
  if (f.build !== null && ordered.some((b) => b.buildId === f.build)) ids.push(f.build);
  const detailById = await getBuilds(ids);
  const authorIds = [...detailById.values()].map((d) => d.authorId);
  const [names, ranks] = await Promise.all([safe(getPlayerNames(authorIds)), safe(getPlayerRanks(authorIds))]);
  return { ordered, detailById, names: names ?? {}, ranks: ranks ?? {} };
}

async function Results({
  f,
  stats: statsPromise,
  rows: rowsPromise,
  heroById,
  items: itemsPromise,
  rank,
  allRanks,
}: {
  f: Filters;
  stats: Promise<Stats | null>;
  rows: Promise<Rows | null>;
  heroById: Record<number, BrowserHero>;
  items: Promise<Awaited<ReturnType<typeof getItems>> | null>;
  rank: Rank | null;
  allRanks: Rank[];
}) {
  const t = (await getT()).builds;
  const { date, num } = await getFormat();
  const [stats, loaded, items] = await Promise.all([statsPromise, rowsPromise, itemsPromise]);
  if (!stats) {
    return (
      <div className="mt-8">
        <Unavailable what={t.what} />
      </div>
    );
  }
  if (stats.builds.length === 0 || !loaded) {
    if (f.tier !== null) {
      return (
        <p className="mt-8 max-w-[64ch] text-ivory-dim">
          {t.noneForRank(heroName(f, heroById, t), rank?.name ?? "")}{" "}
          <FilterLink href={href(f, { tier: null, build: null })} className="text-brass underline">
            {t.allRanks}
          </FilterLink>
          .
        </p>
      );
    }
    return (
      <p className="mt-8 max-w-[64ch] text-ivory-dim">
        {t.noneThisWeek}
      </p>
    );
  }

  const { ordered: matching, detailById, names, ranks } = loaded;
  const badges: Record<number, BrowserBadge> = {};
  for (const [id, r] of Object.entries(ranks)) {
    const info = allRanks.find((x) => x.tier === r.tier);
    const img = info?.images[`large_subrank${r.subrank}_webp`] ?? info?.images[`large_subrank${r.subrank}`] ?? rankImage(allRanks, r.tier, r.subrank);
    const name = info?.name;
    if (img && name) badges[Number(id)] = { image: img, label: `${name} ${ROMAN_SUB[r.subrank] ?? r.subrank}` };
  }

  const shown = matching.slice(0, f.n);
  const selected = matching.find((b) => b.buildId === f.build) ?? null;
  const list = !selected || shown.some((b) => b.buildId === selected.buildId) ? shown : [selected, ...shown];

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
          ? t.summaryAll(num(stats.builds.length), date(stats.since))
          : t.summaryRank(num(matching.length), rank?.name ?? "", date(stats.since))}
        {" · "}
        {heroName(f, heroById, t)}.
        {f.sort === "winrate" && t.sortedNote(MIN_MATCHES)}
      </p>
      <BuildBrowser
        key={`${f.hero}-${f.tier}-${f.sort}`}
        rows={list.map((b) => {
          const d = detailById.get(b.buildId) ?? null;
          return {
            stat: b,
            detail: d,
            author: d ? (names[d.authorId] ?? null) : null,
            badge: d ? (badges[d.authorId] ?? null) : null,
          };
        })}
        initialId={selected?.buildId ?? null}
        heroes={heroById}
        items={itemMap}
        tier={f.tier}
        rankName={rank?.name ?? null}
        moreHref={rest > 0 && f.n < MAX ? href(f, { n: f.n + PAGE, build: null }) : null}
        moreCount={Math.min(PAGE, rest)}
      />
    </>
  );
}

function heroName(f: Filters, heroById: Record<number, BrowserHero>, t: Messages["builds"]): string {
  return f.hero !== null ? (heroById[f.hero]?.name ?? t.unknownHero(f.hero)) : t.allHeroesLower;
}

async function Skeleton() {
  const t = (await getT()).builds;
  return (
    <div aria-busy="true" aria-label={t.loadingAria}>
      <LoadingState label={t.loading} className="mt-8" />
      <div className="mt-8 h-32 border-y border-brass-dim" />
      <SkeletonRows />
    </div>
  );
}

/** Mientras llega la lista (los filtros ya están en pantalla). */
function ListSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true">
      <LoadingState label={label} className="mt-6" />
      <SkeletonRows />
    </div>
  );
}

function SkeletonRows() {
  return (
    <ul className="mt-10 border border-brass-dim bg-ox-deep" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="flex gap-3 border-b border-brass-dim/40 px-4 py-3">
          <span className="size-11 bg-wine/60" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-1/3 bg-wine/40" />
            <span className="h-3 w-1/5 bg-wine/30" />
          </span>
        </li>
      ))}
    </ul>
  );
}
