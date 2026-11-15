import { RadioIcon, ScrollIcon, TrendIcon, TrophyIcon } from "@/components/Icons";
import { LoadingState } from "@/components/Spinner";
import Link from "@/components/Link";
import { Suspense } from "react";
import { RisingHeroes } from "@/components/HeroCards";
import { HeroIcon } from "@/components/HeroIcon";
import { SearchForm } from "@/components/SearchForm";
import { Unavailable } from "@/components/Unavailable";
import {
  REGIONS,
  type Hero,
  type Region,
  getActiveMatches,
  getHeroStats,
  getHeroes,
  getLeaderboard,
  getMatchesPerDay,
  getPatches,
  safe,
} from "@/lib/api";
import { getFormat } from "@/i18n/server-format";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

function Lozenge() {
  return <span className="inline-block size-1.5 rotate-45 self-center bg-brass-dim" aria-hidden="true" />;
}

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const c = getMessages(lang);
  const title = `${c.common.siteName} · ${c.home.metaTitle}`;
  const meta = pageMeta({ lang, path: "/", title, description: c.common.description });
  return { ...meta, title: { absolute: title } };
}

export default async function Home({ searchParams }: PageProps<"/[lang]">) {
  const t = (await getT()).home;
  return (
    <main className="mx-auto max-w-[1320px] px-4 sm:px-8">
      <section className="deco-frame mt-8 bg-[linear-gradient(180deg,var(--wine-raised),var(--ox))] px-5 py-12 text-center sm:mt-10 sm:px-12 sm:py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-brass-dim">{t.eyebrow}</p>
        <h1 className="font-display text-[clamp(2.1rem,1.2rem+3.6vw,3.9rem)] leading-[1.05] tracking-[0.12em] text-brass">
          {t.h1.toUpperCase()}
        </h1>
        <p className="mx-auto mt-3 max-w-[56ch] text-ivory-dim">
          {t.intro}
        </p>
        <div className="mx-auto mt-8 max-w-[720px]">
          <SearchForm />
        </div>
        <Suspense fallback={<p className="mt-6 h-5" aria-hidden="true" />}>
          <HeroLiveStats />
        </Suspense>
      </section>
      <Suspense fallback={<LoadingState label={t.loading} className="mt-16" />}>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HeroLiveStats() {
  const t = (await getT()).home;
  const { num } = await getFormat();
  const [perDay, active] = await Promise.all([safe(getMatchesPerDay()), safe(getActiveMatches())]);
  return (
    <p className="mx-auto mt-6 flex max-w-[720px] flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-ivory-dim">
      {perDay != null && (
        <span>
          <strong className="font-semibold text-ivory">{num(perDay)}</strong> {t.perDay}
        </span>
      )}
      {active && (
        <>
          <Lozenge />
          <span>
            <strong className="font-semibold text-ivory">{active.total}</strong> {t.liveTop}
          </span>
        </>
      )}
    </p>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/[lang]">["searchParams"] }) {
  const t = (await getT()).home;
  const { date } = await getFormat();
  const [heroes, heroStats, active, patches] = await Promise.all([
    safe(getHeroes()),
    safe(getHeroStats()),
    safe(getActiveMatches()),
    safe(getPatches(1)),
  ]);
  const byId = new Map((heroes ?? []).map((h) => [h.id, h]));

  const sections = [
    {
      href: "/directo",
      Icon: RadioIcon,
      title: t.liveTitle,
      text: active ? t.liveText(active.total) : t.liveTextNone,
    },
    {
      href: "/parches",
      Icon: ScrollIcon,
      title: t.patchesTitle,
      text: patches?.[0] ? t.patchesText(patches[0].title, date(patches[0].date)) : t.patchesTextNone,
    },
  ];

  return (
    <>
      <div className="mt-16 grid gap-x-12 gap-y-16 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="heroes">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="heroes" className="section-title"><TrendIcon />{t.rising}</h2>
            <Link href="/heroes" className="text-sm font-semibold uppercase tracking-[0.14em] text-brass">
              {t.seeAll}
            </Link>
          </div>
          {heroStats && heroes ? (
            <RisingHeroes stats={heroStats.stats.slice(0, 4)} byId={byId} />
          ) : (
            <div className="mt-6">
              <Unavailable what={t.heroStatsWhat} />
            </div>
          )}
        </section>

        <section id="clasificacion" className="scroll-mt-8">
          <h2 className="section-title"><TrophyIcon />{t.leaderboard}</h2>
          <Suspense fallback={<LeaderboardSkeleton />}>
            <Leaderboard searchParams={searchParams} byId={byId} />
          </Suspense>
        </section>
      </div>

      <ul className="mt-16 grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="group flex h-full items-center gap-5 border border-brass-dim bg-ox-deep px-5 py-6 no-underline transition-colors hover:border-brass"
            >
              <span className="grid size-14 flex-none place-items-center border border-brass-dim text-brass transition-colors group-hover:border-brass group-hover:bg-brass group-hover:text-ox-deep">
                <s.Icon size={28} />
              </span>
              <span className="min-w-0 flex-1">
                <h2 className="font-display text-2xl tracking-[0.12em] text-brass">{s.title.toUpperCase()}</h2>
                <p className="mt-1 text-sm text-ivory-dim">{s.text}</p>
              </span>
              <span aria-hidden="true" className="text-brass transition-transform group-hover:translate-x-1">
                <svg width="22" height="12" viewBox="0 0 22 12">
                  <path d="M0 6h20M15 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Leaderboard({
  searchParams,
  byId,
}: {
  searchParams: PageProps<"/[lang]">["searchParams"];
  byId: Map<number, Hero>;
}) {
  const c = await getT();
  const t = c.home;
  const sp = await searchParams;
  const region: Region = typeof sp.region === "string" && sp.region in REGIONS ? (sp.region as Region) : "Europe";
  const entries = await safe(getLeaderboard(region, 10));

  return (
    <div className="mt-6">
      <nav aria-label={t.regionLabel} className="flex flex-wrap gap-1.5">
        {(Object.keys(REGIONS) as Region[]).map((r) => (
          <Link
            key={r}
            href={`/?region=${r}#clasificacion`}
            scroll={false}
            aria-current={r === region ? "true" : undefined}
            className={`border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] no-underline transition-colors ${
              r === region
                ? "border-brass bg-brass text-ox-deep"
                : "border-brass-dim text-ivory-dim hover:border-brass hover:text-ivory"
            }`}
          >
            {c.common.regions[r]}
          </Link>
        ))}
      </nav>
      {entries ? (
        <ol className="mt-4">
          {entries.map((e) => (
            <li key={e.rank} className="flex items-center gap-4 border-b border-brass-dim/40 py-2.5">
              <span className="w-8 text-right font-display text-2xl text-brass">{e.rank}</span>
              <Link
                href={`/jugadores?q=${encodeURIComponent(e.name)}`}
                className="min-w-0 flex-1 truncate font-semibold hover:text-brass"
                title={t.viewProfile(e.name)}
              >
                {e.name}
              </Link>
              <span className="flex gap-1">
                {e.heroIds.slice(0, 3).map((id) => (
                  <HeroIcon key={id} hero={byId.get(id)} size={28} />
                ))}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4">
          <Unavailable what={t.leaderboardWhat} />
        </div>
      )}
      <p className="mt-3 text-xs text-ivory-dim">{t.hourly}</p>
    </div>
  );
}

async function LeaderboardSkeleton() {
  const t = (await getT()).home;
  return (
    <div className="mt-6" aria-busy="true" aria-label={t.leaderboardLoading}>
      <LoadingState label={t.leaderboardLoading} className="min-h-0 py-6" />
      <div className="h-7 w-3/4 bg-wine/60" />
      <ol className="mt-4">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i} className="flex items-center gap-4 border-b border-brass-dim/40 py-2.5">
            <span className="h-7 w-8 bg-wine/60" />
            <span className="h-4 flex-1 bg-wine/40" />
          </li>
        ))}
      </ol>
    </div>
  );
}
