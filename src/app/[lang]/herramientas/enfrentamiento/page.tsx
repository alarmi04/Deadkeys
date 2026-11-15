import type { Metadata } from "next";
import Image from "next/image";
import { Barlow_Condensed } from "next/font/google";
import { Suspense } from "react";
import { CopyCode } from "@/components/CopyCode";
import Link from "@/components/Link";
import { MatchupArena, type ArenaHero } from "@/components/MatchupArena";
import { MatchupItems } from "@/components/MatchupItems";
import { LoadingState } from "@/components/Spinner";
import { Unavailable } from "@/components/Unavailable";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import {
  type Duel,
  type DuelSide,
  getBuild,
  getBuildStats,
  getDuel,
  getHeroItemRecords,
  getHeroShowcase,
  getHeroStats,
  getHeroes,
  getItems,
  getMatchupItemRecords,
  safe,
} from "@/lib/api";
import { buildFit, liftSign, liftTone, matchupItems, minSample } from "@/lib/matchup";
import { pageMeta } from "@/lib/seo";
import "./duel.css";

const PATH = "/herramientas/enfrentamiento";

export async function generateMetadata({ params }: PageProps<"/[lang]/herramientas/enfrentamiento">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).matchup;
  return pageMeta({ lang, path: PATH, title: t.metaTitle, description: t.metaDesc });
}

const barlow = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

/** Builds publicadas que se puntúan: las más jugadas, y solo si tienen un mínimo de partidas esta semana. */
const BUILDS = 6;
const BUILD_MIN_MATCHES = 20;

type SP = PageProps<"/[lang]/herramientas/enfrentamiento">["searchParams"];

export default async function MatchupPage({ searchParams }: PageProps<"/[lang]/herramientas/enfrentamiento">) {
  const t = (await getT()).matchup;
  return (
    <main className={`${barlow.variable} pb-12`}>
      <h1 className="duel-wrap pb-5 pt-8 font-barlow text-[clamp(2.1rem,1.4rem+1.9vw,3.1rem)] font-extrabold uppercase leading-none tracking-[0.01em] text-brass">
        {t.title}
      </h1>
      <Suspense fallback={<LoadingState label={t.loading} className="min-h-[60vh]" />}>
        <Arena searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function heroParam(v: string | string[] | undefined, valid: Set<number>): number | null {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && valid.has(n) ? n : null;
}

async function Arena({ searchParams }: { searchParams: SP }) {
  const m = await getT();
  const sp = await searchParams;
  const [showcase, heroes] = await Promise.all([safe(getHeroShowcase(m.lang)), safe(getHeroes())]);
  if (!showcase || !heroes) {
    return (
      <div className="duel-wrap">
        <Unavailable what={m.matchup.what} />
      </div>
    );
  }

  const playable = new Set(heroes.filter((h) => h.playable).map((h) => h.id));
  const list: ArenaHero[] = showcase
    .filter((h) => playable.has(h.id))
    .sort((x, y) => x.name.localeCompare(y.name, m.lang))
    .map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      card: h.card,
      gloat: h.gloat,
      vertical: h.vertical,
      background: h.background,
      nameImage: h.nameImage,
    }));
  const valid = new Set(list.map((h) => h.id));
  const a = heroParam(sp.a, valid);
  const b = heroParam(sp.b, valid);
  const duel = a !== null && b !== null ? await safe(getDuel(a, b)) : null;
  const byId = new Map(list.map((h) => [h.id, h]));

  return (
    <MatchupArena heroes={list} a={a} b={b} split={duel?.winRate ?? null}>
      {a !== null && b !== null && (
        <div className="duel-wrap">
          <Suspense key={`${a}-${b}`} fallback={<LoadingState label={m.matchup.resultsLoading} className="mt-10" />}>
            <Results a={byId.get(a)!} b={byId.get(b)!} duel={duel} />
          </Suspense>
        </div>
      )}
    </MatchupArena>
  );
}

async function Results({ a, b, duel }: { a: ArenaHero; b: ArenaHero; duel: Duel | null }) {
  const m = await getT();
  const t = m.matchup;
  if (!duel) return <p className="mt-10 text-ivory-dim">{t.duel.none(a.name, b.name)}</p>;

  const [items, pair, general, heroStats, buildStats] = await Promise.all([
    safe(getItems(m.lang)),
    safe(getMatchupItemRecords(a.id, b.id)),
    safe(getHeroItemRecords(a.id)),
    safe(getHeroStats()),
    safe(getBuildStats(a.id, null)),
  ]);
  const { compact, date, num } = await getFormat();

  const min = minSample(duel.matches);
  const rows =
    items && pair && general
      ? matchupItems({
          pair,
          general,
          items,
          min,
        })
      : null;

  return (
    <>
      <section aria-labelledby="duel-title" className="mt-12">
        <h2 id="duel-title" className="section-title">{t.duel.title(a.name, b.name)}</h2>
        {heroStats && <p className="mt-2 text-sm text-ivory-dim">{t.duel.summary(num(duel.matches), date(heroStats.since))}</p>}
        <DuelTable a={a} b={b} duel={duel} />
      </section>

      <section aria-labelledby="items-title" className="mt-14">
        <h2 id="items-title" className="section-title">{t.items.title(a.name, b.name)}</h2>
        <p className="mt-2 max-w-[78ch] text-sm text-ivory-dim">
          {t.items.intro(b.name)} {t.items.fewData(compact(min))}
        </p>
        {rows ? (
          rows.length > 0 ? <MatchupItems rows={rows} enemy={b.name} /> : <p className="mt-6 text-ivory-dim">{t.items.none}</p>
        ) : (
          <div className="mt-6">
            <Unavailable what={m.items.list.what} />
          </div>
        )}
      </section>

      {rows && rows.length > 0 && (
        <Suspense fallback={<LoadingState label={t.resultsLoading} className="mt-10" />}>
          <Builds a={a} b={b} rows={rows} stats={buildStats?.builds ?? []} />
        </Suspense>
      )}
    </>
  );
}

const DUEL_ROWS: { key: keyof DuelSide; lowerIsBetter?: boolean }[] = [
  { key: "kills" },
  { key: "deaths", lowerIsBetter: true },
  { key: "assists" },
  { key: "souls" },
  { key: "lastHits" },
  { key: "denies" },
  { key: "objDamage" },
];

async function DuelTable({ a, b, duel }: { a: ArenaHero; b: ArenaHero; duel: Duel }) {
  const t = (await getT()).matchup.duel;
  const { pct, num, souls, compact } = await getFormat();
  const fmt = (k: keyof DuelSide, v: number) =>
    k === "souls" ? souls(v) : k === "objDamage" ? compact(v) : k === "lastHits" ? num(v) : num(v, 1);

  const rows = [
    { label: t.rows.winRate, va: pct(duel.winRate), vb: pct(1 - duel.winRate), share: duel.winRate, aWins: duel.winRate >= 0.5 },
    ...DUEL_ROWS.map(({ key, lowerIsBetter }) => {
      const x = duel.a[key];
      const y = duel.b[key];
      return {
        label: t.rows[key],
        va: fmt(key, x),
        vb: fmt(key, y),
        share: x + y > 0 ? x / (x + y) : 0.5,
        aWins: lowerIsBetter ? x <= y : x >= y,
      };
    }),
  ];

  return (
    <table className="duel-table mt-6 w-full" style={{ "--ha": a.color, "--hb": b.color } as React.CSSProperties}>
      <thead>
        <tr>
          <th scope="col" className="text-left">{a.name}</th>
          <th scope="col"><span className="sr-only">—</span></th>
          <th scope="col" className="text-right">{b.name}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="text-left" data-best={r.aWins || undefined}>{r.va}</td>
            <th scope="row">
              <span className="block">{r.label}</span>
              <span aria-hidden="true" className="duel-table-bar">
                <span style={{ width: `${r.share * 100}%` }} />
              </span>
            </th>
            <td className="text-right" data-best={!r.aWins || undefined}>{r.vb}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function Builds({
  a,
  b,
  rows,
  stats,
}: {
  a: ArenaHero;
  b: ArenaHero;
  rows: ReturnType<typeof matchupItems>;
  stats: { buildId: number; matches: number; winRate: number }[];
}) {
  const m = await getT();
  const t = m.matchup.builds;
  const { pct, compact, num } = await getFormat();
  const pool = stats.filter((s) => s.matches >= BUILD_MIN_MATCHES).slice(0, BUILDS);
  const details = await Promise.all(pool.map((s) => safe(getBuild(s.buildId))));
  const byItem = new Map(rows.map((r) => [r.id, r]));
  const icons = new Map(((await safe(getItems(m.lang))) ?? []).map((i) => [i.id, i]));

  const scored = pool
    .map((s, i) => {
      const d = details[i];
      if (!d) return null;
      const ids = d.sections.flatMap((sec) => sec.items.map((it) => it.itemId));
      const fit = buildFit(ids, byItem);
      return fit ? { stat: s, detail: d, fit, ids: [...new Set(ids)] } : null;
    })
    .filter((x) => x !== null)
    .sort((x, y) => y.fit.fit - x.fit.fit);

  const signed = (v: number) => `${liftSign(v)}${num(Math.abs(v) * 100, 1)}`;

  return (
    <section aria-labelledby="builds-title" className="mt-14">
      <h2 id="builds-title" className="section-title">{t.title(a.name, b.name)}</h2>
      <p className="mt-2 max-w-[78ch] text-sm text-ivory-dim">{t.intro(b.name)}</p>
      {scored.length === 0 ? (
        <p className="mt-6 text-ivory-dim">{t.none}</p>
      ) : (
        <ol className="mt-6">
          {scored.map(({ stat, detail, fit, ids }) => (
            <li key={stat.buildId} className="duel-build">
              <div className="min-w-0">
                <Link
                  href={`/builds?heroe=${a.id}&build=${stat.buildId}`}
                  className="block truncate font-barlow text-2xl font-bold uppercase leading-tight tracking-[0.02em] text-ivory no-underline hover:text-brass"
                >
                  {detail.name}
                </Link>
                <p className="mt-0.5 text-xs text-ivory-dim">
                  {t.plays(compact(stat.matches))} · {t.coverage(fit.covered, fit.total)}
                </p>
                <div className="mt-2">
                  <CopyCode code={String(stat.buildId)} />
                </div>
                <ul className="mt-2.5 flex flex-wrap gap-1" aria-hidden="true">
                  {ids.map((id) => {
                    const it = icons.get(id);
                    if (!it?.image) return null;
                    const has = byItem.has(id);
                    return (
                      <li key={id} className="duel-item-icon size-8" data-slot={it.slot ?? undefined} data-dim={!has || undefined} title={it.name}>
                        <Image src={it.image} alt="" width={32} height={32} unoptimized className="size-full object-contain" />
                      </li>
                    );
                  })}
                </ul>
              </div>
              <dl className="flex gap-6 text-right">
                <div>
                  <dt className="font-barlow text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ivory-dim">{t.fit(b.name)}</dt>
                  <dd className={`font-barlow text-3xl font-extrabold leading-none ${liftTone(fit.fit)}`}>
                    {signed(fit.fit)}
                    <span className="ml-1 text-sm font-bold text-ivory-dim">{m.matchup.pts}</span>
                  </dd>
                </div>
                <div>
                  <dt className="font-barlow text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ivory-dim">{t.general}</dt>
                  <dd className="font-barlow text-3xl font-extrabold leading-none text-ivory">{pct(stat.winRate)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
