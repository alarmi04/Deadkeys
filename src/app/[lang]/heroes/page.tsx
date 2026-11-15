import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import { Barlow_Condensed } from "next/font/google";
import { Suspense } from "react";
import { HeroSelect, type SelectRow } from "@/components/HeroSelect";
import { Unavailable } from "@/components/Unavailable";
import { type HeroStat, getHeroShowcase, getHeroStats, safe } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/heroes">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).heroes;
  return pageMeta({ lang, path: "/heroes", title: t.metaTitle, description: t.metaDesc });
}

const barlow = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const SORTS = {
  victorias: (a: HeroStat, b: HeroStat) => b.winRate - a.winRate,
  eleccion: (a: HeroStat, b: HeroStat) => b.pickRate - a.pickRate,
  nombre: (a: HeroStat, b: HeroStat, n: NameOf, locale: string) => n(a).localeCompare(n(b), locale),
};
type NameOf = (s: HeroStat) => string;
type SortKey = keyof typeof SORTS;

export default async function HeroesPage({ searchParams }: PageProps<"/[lang]/heroes">) {
  const t = (await getT()).heroes;
  return (
    <main className={`${barlow.variable} hero-select`}>
      <Suspense
        fallback={
          <div className="hero-select-shell">
            <LoadingState label={t.list.loading} className="min-h-[60vh] lg:col-span-2" />
          </div>
        }
      >
        <Select searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Select({ searchParams }: { searchParams: PageProps<"/[lang]/heroes">["searchParams"] }) {
  const m = await getT();
  const t = m.heroes;
  const { compact, date } = await getFormat();
  const sp = await searchParams;
  const sort: SortKey = typeof sp.orden === "string" && sp.orden in SORTS ? (sp.orden as SortKey) : "victorias";
  const [showcase, heroStats] = await Promise.all([safe(getHeroShowcase(m.lang)), safe(getHeroStats())]);
  if (!showcase || !heroStats) {
    return (
      <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-8">
        <Unavailable what={t.list.statsWhat} />
      </div>
    );
  }
  const byId = new Map(showcase.map((h) => [h.id, h]));
  const nameOf: NameOf = (s) => byId.get(s.heroId)?.name ?? String(s.heroId);
  const stats = [...heroStats.stats].sort((a, b) => SORTS[sort](a, b, nameOf, m.lang));
  const rankByWin = new Map(heroStats.stats.map((s, i) => [s.heroId, i + 1]));

  const rows: SelectRow[] = stats.flatMap((s) => {
    const hero = byId.get(s.heroId);
    return hero ? [{ hero, stat: s, winRank: rankByWin.get(s.heroId)! }] : [];
  });

  return (
    <HeroSelect
      rows={rows}
      total={heroStats.stats.length}
      sort={sort}
      sorts={(Object.keys(SORTS) as SortKey[]).map((k) => ({ key: k, label: t.list.sorts[k] }))}
      sample={t.list.sample(date(heroStats.since), compact(heroStats.totalMatches))}
    />
  );
}
