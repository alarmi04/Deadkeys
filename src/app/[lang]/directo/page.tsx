import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import Link from "@/components/Link";
import { HeroIcon } from "@/components/HeroIcon";
import { PageHeader } from "@/components/PageHeader";
import { Unavailable } from "@/components/Unavailable";
import { getActiveMatches, getHeroes, safe } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/directo">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).matches.live;
  return pageMeta({ lang, path: "/directo", title: t.metaTitle, description: t.metaDesc });
}

export default async function LivePage() {
  const m = await getT();
  const t = m.matches.live;
  const { duration, souls } = await getFormat();
  const [heroes, active] = await Promise.all([safe(getHeroes()), safe(getActiveMatches(30))]);
  const byId = new Map((heroes ?? []).map((h) => [h.id, h]));

  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />
      {!active ? (
        <div className="mt-8">
          <Unavailable what={t.what} />
        </div>
      ) : active.matches.length === 0 ? (
        <p className="mt-8 text-ivory-dim">{t.none}</p>
      ) : (
        <ul className="mt-8 border-t border-brass-dim/40">
          {active.matches.map((match) => {
            const [a, b] = match.netWorth;
            return (
              <li key={match.matchId} className="border-b border-brass-dim/40">
                <Link
                  href={`/directo/${match.matchId}`}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 py-3 hover:bg-wine/40 focus-visible:bg-wine/40"
                >
                  <span className="min-w-24 font-display tracking-[0.06em] text-brass">#{match.matchId}</span>
                  {/* En pantallas estrechas el segundo equipo baja a su propia línea */}
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="flex items-center gap-1">
                      {match.teams[0].map((p, i) => (
                        <HeroIcon key={`${p.accountId}-${i}`} hero={byId.get(p.heroId)} size={28} />
                      ))}
                    </span>
                    <span className="mx-1 text-xs text-ivory-dim">vs</span>
                    <span className="flex items-center gap-1">
                      {match.teams[1].map((p, i) => (
                        <HeroIcon key={`${p.accountId}-${i}`} hero={byId.get(p.heroId)} size={28} />
                      ))}
                    </span>
                  </span>
                  <span className="ml-auto flex flex-wrap items-center gap-x-5 text-xs uppercase tracking-[0.1em] text-ivory-dim">
                    <span>{match.ranked ? t.ranked : (match.mode ?? t.otherMode)}</span>
                    <span>{match.region ? m.common.regions[match.region] : "—"}</span>
                    {match.elapsed !== null && <span>{duration(match.elapsed)}</span>}
                    <span>
                      {souls(a)} · {souls(b)}
                    </span>
                    <span>
                      {t.spectators(match.spectators)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
