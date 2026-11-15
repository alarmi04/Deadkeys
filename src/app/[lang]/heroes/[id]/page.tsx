import { BoltIcon, BarsIcon, ChestIcon, HammerIcon, BookIcon } from "@/components/Icons";
import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AbilityList } from "@/components/AbilityList";
import { Dial } from "@/components/Dial";
import { HeroBuilds } from "@/components/HeroBuilds";
import { Unavailable } from "@/components/Unavailable";
import {
  type Item,
  type PopularItem,
  getAbilityTips,
  type Matchup,
  getHeroDetail,
  getHeroMatchups,
  getHeroStats,
  getHeroes,
  getItems,
  safe,
} from "@/lib/api";
import { JsonLd } from "@/components/JsonLd";
import { isLocale, localePath } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, breadcrumbLd, clip } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/heroes/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).heroes.detail;
  const heroId = Number(id);
  if (!Number.isInteger(heroId) || heroId <= 0) return { title: t.notFound, robots: { index: false } };
  const [detail, heroes] = await Promise.all([safe(getHeroDetail(heroId, lang)), safe(getHeroes())]);
  const hero = heroes?.find((h) => h.id === heroId);
  if (!detail) return { title: hero ? hero.name : t.fallbackTitle, robots: { index: false } };
  const intro = [detail.role, detail.playstyle].filter(Boolean).join(". ");
  return pageMeta({
    lang,
    path: `/heroes/${heroId}`,
    title: t.title(detail.name),
    description: clip(t.desc(detail.name, intro)),
    images: hero?.card ? [{ url: hero.card, alt: detail.name }] : undefined,
  });
}

export default async function HeroPage({ params, searchParams }: PageProps<"/[lang]/heroes/[id]">) {
  const t = (await getT()).heroes.detail;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <Suspense fallback={<LoadingState label={t.loading} className="mt-10" />}>
        <HeroView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HeroView({
  params,
  searchParams,
}: {
  params: PageProps<"/[lang]/heroes/[id]">["params"];
  searchParams: PageProps<"/[lang]/heroes/[id]">["searchParams"];
}) {
  const m = await getT();
  const t = m.heroes.detail;
  const { compact, num, pct } = await getFormat();
  const { id } = await params;
  const heroId = Number(id);
  if (!Number.isInteger(heroId) || heroId <= 0) notFound();

  const [detail, heroStats, heroes, items, tips, matchups] = await Promise.all([
    safe(getHeroDetail(heroId, m.lang)),
    safe(getHeroStats()),
    safe(getHeroes()),
    safe(getItems(m.lang)),
    safe(getAbilityTips(m.lang)),
    safe(getHeroMatchups(heroId)),
  ]);
  if (detail === null && heroes && !heroes.some((h) => h.id === heroId)) notFound();
  if (!detail) {
    return (
      <div className="mt-10">
        <Unavailable what={t.what} />
      </div>
    );
  }

  const hero = heroes?.find((h) => h.id === heroId);
  const stat = heroStats?.stats.find((s) => s.heroId === heroId);
  const rank = stat && heroStats ? heroStats.stats.findIndex((s) => s.heroId === heroId) + 1 : null;
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const abilities = detail.abilityClasses
    .map((c) => items?.find((i) => i.className === c))
    .filter((i): i is Item => !!i);
  const accent = detail.color ?? "var(--brass)";
  const heroById = new Map((heroes ?? []).map((h) => [h.id, h]));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumbLd([
              { name: m.common.home, path: localePath(m.lang, "/") },
              { name: m.common.nav.heroes, path: localePath(m.lang, "/heroes") },
              { name: detail.name, path: localePath(m.lang, `/heroes/${heroId}`) },
            ]),
            {
              "@type": "WebPage",
              "@id": absoluteUrl(localePath(m.lang, `/heroes/${heroId}`)),
              url: absoluteUrl(localePath(m.lang, `/heroes/${heroId}`)),
              name: t.pageName(detail.name),
              inLanguage: m.lang,
              about: { "@type": "Thing", name: detail.name, description: detail.role || undefined },
              primaryImageOfPage: hero?.card ? { "@type": "ImageObject", url: hero.card } : undefined,
              isPartOf: { "@id": absoluteUrl("/#website") },
            },
          ],
        }}
      />
      <p className="pt-8 text-sm">
        <Link href="/heroes" className="uppercase tracking-[0.14em] text-brass">
          {t.back}
        </Link>
      </p>

      <section className="deco-frame relative mt-4 grid gap-8 overflow-hidden bg-[linear-gradient(180deg,var(--wine-raised),var(--ox))] px-6 py-10 sm:px-12 md:grid-cols-[minmax(0,260px)_1fr] md:items-center">
        {hero?.card && (
          <div className="relative mx-auto aspect-[280/300] w-full max-w-[260px] overflow-hidden border border-brass-dim bg-ox-deep">
            <Image src={hero.card} alt={detail.name} fill priority sizes="260px" className="object-cover object-top" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="break-words font-display text-[clamp(2.2rem,1.3rem+3.4vw,3.8rem)] leading-tight tracking-[0.1em] text-brass">
            {detail.name.toUpperCase()}
          </h1>
          {detail.role && <p className="mt-2 text-xl text-ivory">{detail.role}</p>}
          <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
            {[detail.gunTag, ...detail.tags].filter(Boolean).map((t) => (
              <li key={t} className="border px-2.5 py-1 text-ivory-dim" style={{ borderColor: accent }}>
                {t}
              </li>
            ))}
          </ul>
          {detail.playstyle && <p className="mt-5 max-w-[62ch] text-ivory-dim">{detail.playstyle}</p>}
          {stat && (
            <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4">
              <Dial value={stat.winRate} label={m.common.heroCard.winsLabel(detail.name, pct(stat.winRate))} />
              <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Fact label={t.pick} value={pct(stat.pickRate)} />
                <Fact label={t.rankByWins} value={rank ? t.rankOf(rank, heroStats!.stats.length) : "—"} />
                <Fact label={t.kda} value={`${num(stat.kills, 1)} / ${num(stat.deaths, 1)} / ${num(stat.assists, 1)}`} />
                <Fact label={t.matches30} value={compact(stat.matches)} />
              </dl>
            </div>
          )}
          {matchups && (matchups.strong.length > 0 || matchups.weak.length > 0) && (
            <div className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              <Matchups title={t.goodVs} tone="win" list={matchups.strong} heroes={heroById} />
              <Matchups title={t.badVs} tone="loss" list={matchups.weak} heroes={heroById} />
            </div>
          )}
        </div>
      </section>

      {abilities.length > 0 && (
        <section className="mt-16" aria-labelledby="habilidades">
          <h2 id="habilidades" className="section-title"><BoltIcon />{t.abilities}</h2>
          <div className="mt-8">
            <AbilityList
              named
              color={accent}
              abilities={abilities.map((a) => ({ name: tips?.[a.className]?.name ?? a.name, image: a.image, tip: tips?.[a.className] ?? null }))}
            />
          </div>
        </section>
      )}

      <div className="mt-16 grid gap-x-12 gap-y-16 lg:grid-cols-[1fr_2fr]">
        {detail.stats.some((s) => t.statLabels[s.key]) && (
          <section aria-labelledby="base">
            <h2 id="base" className="section-title"><BarsIcon />{t.baseStats}</h2>
            <dl className="mt-6">
              {detail.stats
                .filter((s) => t.statLabels[s.key])
                .map((s) => (
                  <div key={s.key} className="flex justify-between gap-4 border-b border-brass-dim/40 py-2.5">
                    <dt className="text-ivory-dim">{t.statLabels[s.key]}</dt>
                    <dd className="font-semibold">{num(s.value, Number.isInteger(s.value) ? 0 : 1)}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}

        <section aria-labelledby="objetos">
          <h2 id="objetos" className="section-title"><ChestIcon />{t.items}</h2>
          <p className="mt-3 text-sm text-ivory-dim">{t.itemsHint}</p>
          <div className="mt-4 grid gap-x-8 gap-y-8 md:grid-cols-3">
            <Phase title={t.early} list={detail.popular.early} itemById={itemById} />
            <Phase title={t.mid} list={detail.popular.mid} itemById={itemById} />
            <Phase title={t.late} list={detail.popular.late} itemById={itemById} />
          </div>
        </section>
      </div>

      <section className="mt-16" aria-labelledby="builds">
        <h2 id="builds" className="section-title"><HammerIcon />{t.builds}</h2>
        <p className="mt-3 max-w-[64ch] text-sm text-ivory-dim">
          {t.buildsIntro(detail.name)}
        </p>
        <HeroBuilds
          hero={{ id: heroId, name: detail.name, small: hero?.small ?? "" }}
          items={items}
          searchParams={searchParams}
        />
      </section>

      {detail.lore && (
        <section className="mt-16 max-w-[70ch]" aria-labelledby="historia">
          <h2 id="historia" className="section-title"><BookIcon />{t.lore}</h2>
          <div className="mt-6 space-y-4 text-ivory-dim">
            {detail.lore
              .split(/<br\s*\/?>/i)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p) => (
                <p key={p}>{p}</p>
              ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Héroes enemigos con los que más gana (verde) o más pierde (rojo), con retrato circular y su porcentaje de victorias. */
async function Matchups({
  title,
  tone,
  list,
  heroes,
}: {
  title: string;
  tone: "win" | "loss";
  list: Matchup[];
  heroes: Map<number, { id: number; name: string; small: string }>;
}) {
  if (list.length === 0) return null;
  const t = (await getT()).heroes.detail;
  const { compact, pct } = await getFormat();
  return (
    <div>
      <h2 className="text-xs uppercase tracking-[0.12em] text-ivory-dim">{title}</h2>
      <ul className="mt-2 flex flex-wrap gap-3">
        {list.map((m) => {
          const h = heroes.get(m.heroId);
          return (
            <li key={m.heroId}>
              <Link
                href={`/heroes/${m.heroId}`}
                title={t.vsTitle(h?.name ?? String(m.heroId), pct(m.winRate), compact(m.matches))}
                aria-label={t.vsAria(h?.name ?? String(m.heroId), pct(m.winRate))}
                className="group flex w-11 flex-col items-center gap-1 no-underline"
              >
                <span
                  className={`relative block size-11 overflow-hidden rounded-full border-2 bg-ox-deep transition-transform group-hover:scale-110 ${
                    tone === "win" ? "border-win" : "border-loss"
                  }`}
                >
                  {h?.small && <Image src={h.small} alt="" fill sizes="44px" className="object-cover object-top" />}
                </span>
                <span className={`text-[0.7rem] font-semibold leading-none ${tone === "win" ? "text-win" : "text-loss"}`}>
                  {pct(m.winRate, 0)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-ivory-dim">{label}</dt>
      <dd className="text-lg font-semibold text-ivory">{value}</dd>
    </div>
  );
}

function ItemIcon({ item, size }: { item: Item | undefined; size: number }) {
  if (!item?.image) {
    return <span className="inline-block shrink-0 bg-wine" style={{ width: size, height: size }} aria-hidden="true" />;
  }
  return <Image src={item.image} alt={item.name} title={item.name} width={size} height={size} className="shrink-0 object-contain" />;
}

async function Phase({ title, list, itemById }: { title: string; list: PopularItem[]; itemById: Map<number, Item> }) {
  const t = (await getT()).heroes.detail;
  const { pct } = await getFormat();
  const top = [...list].sort((a, b) => b.pickRate - a.pickRate).slice(0, 6);
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-brass">{title}</h3>
      <ul className="mt-2">
        {top.map((p) => {
          const item = itemById.get(p.itemId);
          return (
            <li key={p.itemId} className="flex items-center gap-3 border-b border-brass-dim/40 py-2">
              <ItemIcon item={item} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item?.name ?? p.itemId}</span>
                <span className="block text-xs text-ivory-dim">{item?.slot ? t.slots[item.slot] : ""}</span>
              </span>
              <span className="text-right text-xs">
                <span className="block text-ivory">{pct(p.pickRate, 0)}</span>
                <span className={`block ${p.winRate >= 0.5 ? "text-win" : "text-loss"}`}>{pct(p.winRate)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
