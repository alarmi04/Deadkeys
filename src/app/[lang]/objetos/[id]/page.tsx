import { InfoIcon, TargetIcon, UsersIcon, ShieldIcon } from "@/components/Icons";
import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { HeroIcon } from "@/components/HeroIcon";
import { JsonLd } from "@/components/JsonLd";
import type { Messages } from "@/i18n/messages";
import { Unavailable } from "@/components/Unavailable";
import {
  type Hero,
  type Item,
  type ItemHeroRow,
  getHeroStats,
  getHeroes,
  getItemBuyStats,
  getItemInfo,
  getItems,
  getItemsByEnemy,
  getItemsByHero,
  safe,
} from "@/lib/api";
import { isLocale, localePath } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, breadcrumbLd, clip } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/objetos/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const m = getMessages(lang);
  const t = m.items.detail;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) return { title: t.notFound, robots: { index: false } };
  const [items, info] = await Promise.all([safe(getItems(lang)), safe(getItemInfo(itemId, lang))]);
  const item = items?.find((i) => i.id === itemId && i.type === "upgrade" && i.inShop);
  if (!item) return { title: t.fallbackTitle, robots: { index: false } };
  const slot = (item.slot && m.common.slotNames[item.slot]) || t.genericItem;
  const stats = (info?.properties ?? []).slice(0, 3).map((p) => `${p.label} ${p.value}`).join(", ");
  const text = info?.description.replace(/<[^>]+>/g, "").trim() || (stats ? t.statsFallback(stats) : "") || item.quip || "";
  const cost = item.cost && item.cost < 9999 ? t.costSentence(item.cost) : "";
  return pageMeta({
    lang,
    path: `/objetos/${itemId}`,
    title: t.title(item.name),
    description: clip(`${t.descLead(item.name, slot.toLowerCase())}${cost} ${text}`),
    images: item.image ? [{ url: item.image, alt: item.name }] : undefined,
  });
}

const SLOT = {
  weapon: { color: "var(--slot-weapon)" },
  spirit: { color: "var(--slot-spirit)" },
  vitality: { color: "var(--slot-vitality)" },
} as const;
const ROMAN = ["", "I", "II", "III", "IV", "V"];
/** Muestras mínimas para fiarse de un porcentaje. */
const MIN_HERO = 100;
const MIN_ENEMY = 200;

export default async function ItemPage({ params }: PageProps<"/[lang]/objetos/[id]">) {
  const t = (await getT()).items.detail;
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-12 sm:px-8">
      <Suspense fallback={<LoadingState label={t.loading} className="mt-10" />}>
        <ItemView params={params} />
      </Suspense>
    </main>
  );
}

async function ItemView({ params }: { params: PageProps<"/[lang]/objetos/[id]">["params"] }) {
  const m = await getT();
  const t = m.items.detail;
  const { num } = await getFormat();
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) notFound();

  const [items, info] = await Promise.all([safe(getItems(m.lang)), safe(getItemInfo(itemId, m.lang))]);
  if (!items) {
    return (
      <div className="mt-10">
        <Unavailable what={t.what} />
      </div>
    );
  }
  const item = items.find((i) => i.id === itemId && i.type === "upgrade" && i.inShop);
  if (!item) notFound();
  const slot = {
    label: (item.slot && m.common.slotNames[item.slot]) || t.genericItem,
    color: SLOT[item.slot as keyof typeof SLOT]?.color ?? "var(--brass)",
  };

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumbLd([
              { name: m.common.home, path: localePath(m.lang, "/") },
              { name: m.common.nav.items, path: localePath(m.lang, "/objetos") },
              { name: item.name, path: localePath(m.lang, `/objetos/${itemId}`) },
            ]),
            {
              "@type": "WebPage",
              url: absoluteUrl(localePath(m.lang, `/objetos/${itemId}`)),
              name: t.pageName(item.name),
              inLanguage: m.lang,
              about: { "@type": "Thing", name: item.name, image: item.image || undefined },
              isPartOf: { "@id": absoluteUrl("/#website") },
            },
          ],
        }}
      />
      <Link href={`/objetos${item.slot ? `?tipo=${item.slot}` : ""}`} className="mt-8 inline-block text-sm text-ivory-dim hover:text-brass">
        {t.back(slot.label.toLowerCase())}
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-5 border-b-2 pb-6" style={{ borderColor: slot.color }}>
        <span
          className="grid size-24 shrink-0 place-items-center border-2 sm:size-28"
          style={{ borderColor: slot.color, background: `color-mix(in oklab, ${slot.color} 22%, var(--ox-deep))` }}
        >
          {item.image && <Image src={item.image} alt="" width={112} height={112} className="size-full object-cover" />}
        </span>
        <div>
          <h1 className="font-display text-[clamp(2rem,1.2rem+3vw,3.2rem)] leading-[1.05] tracking-[0.1em] text-brass">
            {item.name.toUpperCase()}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm uppercase tracking-[0.14em] text-ivory-dim">
            <span className="font-semibold" style={{ color: slot.color }}>
              {slot.label}
            </span>
            <span>{m.items.list.level} {ROMAN[item.tier ?? 0] ?? item.tier}</span>
            {item.cost && item.cost < 9999 && <span>{num(item.cost)} {t.souls}</span>}
            {info && <span>{info.active ? t.active : t.passive}</span>}
          </p>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="que-hace">
        <h2 id="que-hace" className="section-title"><InfoIcon />
          {t.whatItDoes}
        </h2>
        {info ? <WhatItDoes info={info} /> : <p className="mt-4 text-ivory-dim">{t.noDescription}</p>}
      </section>

      <Suspense fallback={<Skeleton label={t.loadingBuy} />}>
        <BuyStage itemId={itemId} />
      </Suspense>
      <Suspense fallback={<Skeleton label={t.loadingHeroes} />}>
        <TopHeroes itemId={itemId} />
      </Suspense>
      <Suspense fallback={<Skeleton label={t.loadingCounters} />}>
        <Counters item={item} />
      </Suspense>
    </>
  );
}

/* ---------- Qué hace ---------- */

/** El texto llega con <span class="highlight"> para los números clave; se pinta solo ese marcado. */
function richText(html: string): ReactNode[] {
  return html.split(/(<span class="highlight">[\s\S]*?<\/span>)/).map((part, i) => {
    const hl = /^<span class="highlight">([\s\S]*)<\/span>$/.exec(part);
    const text = (hl ? hl[1] : part).replace(/<[^>]+>/g, "");
    return hl ? (
      <strong key={i} className="font-semibold text-brass">
        {text}
      </strong>
    ) : (
      text
    );
  });
}

async function WhatItDoes({ info }: { info: NonNullable<Awaited<ReturnType<typeof getItemInfo>>> }) {
  const t = (await getT()).items.detail;
  const paragraphs = info.description.split("\n").filter(Boolean);
  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="max-w-[62ch] space-y-3 text-lg leading-relaxed">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => <p key={i}>{richText(p)}</p>)
        ) : (
          <p className="text-ivory-dim">{t.onlyStats}</p>
        )}
        {info.cooldown && (
          <p className="text-sm uppercase tracking-[0.12em] text-ivory-dim">{t.cooldown(info.cooldown)}</p>
        )}
      </div>
      {info.properties.length > 0 && (
        <dl className="panel divide-y divide-brass-dim/30 self-start">
          {info.properties.map((p) => (
            <div key={p.label} className="flex items-baseline justify-between gap-4 px-4 py-2">
              <dt className="text-sm text-ivory-dim">{p.label}</dt>
              <dd className="font-semibold whitespace-nowrap text-ivory">{p.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* ---------- Cuándo se compra ---------- */

function stageOf(seconds: number, t: Messages["items"]["detail"]): string {
  if (seconds < 600) return t.stages.early;
  if (seconds < 1200) return t.stages.mid;
  if (seconds < 1800) return t.stages.advanced;
  return t.stages.end;
}

async function BuyStage({ itemId }: { itemId: number }) {
  const t = (await getT()).items.detail;
  const { compact, duration, pct } = await getFormat();
  const [buy, heroStats] = await Promise.all([safe(getItemBuyStats()), safe(getHeroStats())]);
  const stat = buy?.[itemId];
  return (
    <section className="mt-12" aria-labelledby="cuando">
      <h2 id="cuando" className="section-title"><TargetIcon />
        {t.when}
      </h2>
      {!buy ? (
        <div className="mt-4">
          <Unavailable what={t.buyWhat} />
        </div>
      ) : !stat ? (
        <p className="mt-4 text-ivory-dim">{t.notEnough}</p>
      ) : (
        <div className="mt-5">
          <p className="text-lg">
            {t.buyParts[0]}
            <strong className="text-brass">{duration(Math.round(stat.avgBuyTime))}</strong>
            {t.buyParts[1]}
            <strong className="text-brass">{stageOf(stat.avgBuyTime, t)}</strong>
            {t.buyParts[2]}
          </p>
          <Timeline seconds={stat.avgBuyTime} />
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            <Fact label={t.winsWith} value={pct(stat.winRate)} />
            <Fact
              label={t.matchesWith}
              value={compact(stat.matches)}
              note={heroStats ? t.ofPlayers(compact(heroStats.totalMatches * 12)) : undefined}
            />
          </dl>
        </div>
      )}
    </section>
  );
}

async function Timeline({ seconds }: { seconds: number }) {
  const t = (await getT()).items.detail;
  const { duration } = await getFormat();
  const max = 2400;
  const at = Math.min(Math.max(seconds / max, 0), 1) * 100;
  const marks = [0, 10, 20, 30, 40];
  return (
    <div className="mt-6" role="img" aria-label={t.timelineAria(duration(Math.round(seconds)))}>
      <div className="relative h-3 bg-wine/60">
        <div className="absolute inset-y-0 left-0 bg-brass-dim/70" style={{ width: `${at}%` }} />
        <span
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-ox-deep bg-brass"
          style={{ left: `${at}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-ivory-dim">
        {marks.map((m) => (
          <span key={m}>{m} {t.min}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-4 text-center text-[0.7rem] uppercase tracking-[0.12em] text-ivory-dim/80">
        <span>{t.timeline.early}</span>
        <span>{t.timeline.mid}</span>
        <span>{t.timeline.advanced}</span>
        <span>{t.timeline.end}</span>
      </div>
    </div>
  );
}

/* ---------- Héroes que más lo usan ---------- */

async function TopHeroes({ itemId }: { itemId: number }) {
  const t = (await getT()).items.detail;
  const [byHero, heroes, heroStats] = await Promise.all([
    safe(getItemsByHero()),
    safe(getHeroes()),
    safe(getHeroStats()),
  ]);
  return (
    <section className="mt-12" aria-labelledby="heroes">
      <h2 id="heroes" className="section-title"><UsersIcon />
        {t.topHeroes}
      </h2>
      {!byHero || !heroes || !heroStats ? (
        <div className="mt-4">
          <Unavailable what={t.topHeroesWhat} />
        </div>
      ) : (
        <HeroList rows={byHero[itemId] ?? []} heroes={heroes} heroMatches={new Map(heroStats.stats.map((s) => [s.heroId, s.matches]))} />
      )}
    </section>
  );
}

async function HeroList({
  rows,
  heroes,
  heroMatches,
}: {
  rows: ItemHeroRow[];
  heroes: Hero[];
  heroMatches: Map<number, number>;
}) {
  const t = (await getT()).items.detail;
  const { pct } = await getFormat();
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const list = rows
    .filter(([h, m]) => m >= MIN_HERO && heroMatches.has(h) && byId.has(h))
    .map(([h, m, w]) => ({ hero: byId.get(h)!, matches: m, share: m / heroMatches.get(h)!, winRate: w / m }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 8);
  if (list.length === 0) return <p className="mt-4 text-ivory-dim">{t.noHeroData}</p>;
  const top = list[0].share;
  return (
    <>
      <p className="mt-3 text-sm text-ivory-dim">
        {t.topHeroesHint}
      </p>
      <ol className="mt-4 divide-y divide-brass-dim/30 border-y border-brass-dim/40">
        {list.map((r) => (
          <li key={r.hero.id}>
            <Link
              href={`/heroes/${r.hero.id}`}
              className="grid grid-cols-[2.5rem_8rem_minmax(0,1fr)_4.5rem] items-center gap-x-4 px-2 py-2 no-underline hover:bg-wine/40 sm:grid-cols-[2.5rem_10rem_minmax(0,1fr)_5rem_5rem]"
            >
              <HeroIcon hero={r.hero} size={40} />
              <span className="truncate font-semibold text-ivory">{r.hero.name}</span>
              <span className="hidden h-2 bg-wine/60 sm:block" aria-hidden="true">
                <span className="block h-full bg-brass" style={{ width: `${(r.share / top) * 100}%` }} />
              </span>
              <span className="text-right text-ivory">
                {pct(r.share, 0)}
                <span className="sr-only">{t.ofTheirMatches}</span>
              </span>
              <span className={`text-right ${r.winRate >= 0.5 ? "text-win" : "text-loss"}`}>
                {pct(r.winRate)}
                <span className="sr-only">{t.ofWins}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

/* ---------- Counters ---------- */

async function Counters({ item }: { item: Item }) {
  const t = (await getT()).items.detail;
  const [byEnemy, heroes] = await Promise.all([safe(getItemsByEnemy()), safe(getHeroes())]);
  return (
    <section className="mt-12" aria-labelledby="counters">
      <h2 id="counters" className="section-title"><ShieldIcon />
        {t.counters}
      </h2>
      {!byEnemy || !heroes ? (
        <div className="mt-4">
          <Unavailable what={t.countersWhat} />
        </div>
      ) : (
        <CounterLists rows={byEnemy[item.id] ?? []} all={byEnemy} heroes={heroes} />
      )}
    </section>
  );
}

async function CounterLists({
  rows,
  all,
  heroes,
}: {
  rows: ItemHeroRow[];
  all: Record<number, ItemHeroRow[]>;
  heroes: Hero[];
}) {
  const t = (await getT()).items.detail;
  // Lo que gana un objeto cualquiera contra cada enemigo: un héroe fuerte baja todos los porcentajes,
  // así que se compara con esa media y no con el 50 %.
  const base = new Map<number, [number, number]>();
  for (const list of Object.values(all)) {
    for (const [e, m, w] of list) {
      const b = base.get(e) ?? [0, 0];
      base.set(e, [b[0] + m, b[1] + w]);
    }
  }
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const sum = (l: ItemHeroRow[]) => l.reduce<[number, number]>((a, [, m, w]) => [a[0] + m, a[1] + w], [0, 0]);
  const [im, iw] = sum(rows);
  const [am, aw] = sum(Object.values(all).flat());
  // Doble resta: cuánto se desvía el objeto de su propio rendimiento medio contra ese enemigo,
  // menos cuánto se desvía un objeto cualquiera. Así ni los héroes fuertes ni los objetos flojos falsean la lista.
  const list = rows
    .filter(([e, m]) => m >= MIN_ENEMY && byId.has(e) && base.has(e))
    .map(([e, m, w]) => {
      const [bm, bw] = base.get(e)!;
      return { hero: byId.get(e)!, matches: m, winRate: w / m, delta: w / m - iw / im - (bw / bm - aw / am) };
    })
    .sort((a, b) => a.delta - b.delta);
  if (list.length < 6) return <p className="mt-4 text-ivory-dim">{t.noCounterData}</p>;
  const worst = list.slice(0, 6);
  const best = list.slice(-6).reverse();
  return (
    <>
      <p className="mt-3 max-w-[64ch] text-sm text-ivory-dim">
        {t.countersHint}
      </p>
      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <CounterColumn title={t.counteredBy} hint={t.worseAgainst} rows={worst} tone="loss" />
        <CounterColumn title={t.worksWell} hint={t.betterAgainst} rows={best} tone="win" />
      </div>
    </>
  );
}

async function CounterColumn({
  title,
  hint,
  rows,
  tone,
}: {
  title: string;
  hint: string;
  rows: { hero: Hero; matches: number; winRate: number; delta: number }[];
  tone: "win" | "loss";
}) {
  const t = (await getT()).items.detail;
  const { num, pct } = await getFormat();
  return (
    <div>
      <h3 className={`text-sm font-semibold tracking-[0.16em] uppercase ${tone === "win" ? "text-win" : "text-loss"}`}>
        {title}
      </h3>
      <ul className="mt-3 divide-y divide-brass-dim/30 border-y border-brass-dim/40">
        {rows.map((r) => (
          <li key={r.hero.id}>
            <Link
              href={`/heroes/${r.hero.id}`}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-2 py-2 no-underline hover:bg-wine/40"
              title={t.counterTitle(hint, r.hero.name, num(r.matches))}
            >
              <HeroIcon hero={r.hero} size={36} />
              <span className="truncate font-semibold text-ivory">{r.hero.name}</span>
              <span className="text-sm text-ivory-dim">{pct(r.winRate)}</span>
              <span className={`w-16 text-right font-semibold ${tone === "win" ? "text-win" : "text-loss"}`}>
                {r.delta > 0 ? "+" : "−"}
                {num(Math.abs(r.delta * 100), 1)} {t.pt}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Piezas ---------- */

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-ivory-dim">{label}</dt>
      <dd className="text-2xl font-semibold text-ivory">
        {value}
        {note && <span className="ml-2 text-sm font-normal text-ivory-dim">{note}</span>}
      </dd>
    </div>
  );
}

function Skeleton({ label }: { label: string }) {
  return <LoadingState label={label} className="mt-12 border-y border-brass-dim/40" />;
}
