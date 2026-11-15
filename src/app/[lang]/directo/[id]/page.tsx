import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyCode } from "@/components/CopyCode";
import { HeroIcon } from "@/components/HeroIcon";
import { PageHeader } from "@/components/PageHeader";
import { Unavailable } from "@/components/Unavailable";
import { type ActivePlayer, getActiveMatch, getHeroes, getMap, getPlayerNames, safe } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[lang]/directo/[id]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).matches.live;
  return pageMeta({ lang, path: "/directo", title: t.detailMetaTitle, description: t.detailMetaDesc, noindex: true });
}


export default async function LiveMatchPage({ params }: PageProps<"/[lang]/directo/[id]">) {
  const t = (await getT()).matches.live;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <Suspense
        fallback={
          <>
            <PageHeader title={t.match} />
            <LoadingState label={t.loadingMatch} />
          </>
        }
      >
        <Match params={params} />
      </Suspense>
    </main>
  );
}

async function Match({ params }: { params: PageProps<"/[lang]/directo/[id]">["params"] }) {
  const m = await getT();
  const t = m.matches.live;
  const { duration, souls } = await getFormat();
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();

  const [match, heroes, map] = await Promise.all([
    safe(getActiveMatch(matchId)),
    safe(getHeroes()),
    safe(getMap()),
  ]);

  if (!match) {
    return (
      <>
        <PageHeader title={t.matchN(matchId)} />
        <p className="mt-8 text-ivory-dim">{t.ended}</p>
        <Link href="/directo" className="mt-4 inline-block text-brass hover:underline">
          {t.backLive}
        </Link>
      </>
    );
  }

  const names = (await safe(getPlayerNames(match.teams.flat().map((p) => p.accountId)))) ?? {};
  const byId = new Map((heroes ?? []).map((h) => [h.id, h]));
  const [a, b] = match.netWorth;
  const share = a + b > 0 ? a / (a + b) : 0.5;

  return (
    <>
      <PageHeader
        title={t.matchN(match.matchId)}
        intro={t.intro2(
          match.ranked ? t.ranked : (match.mode ?? t.otherMode),
          match.region ? m.common.regions[match.region] : "—",
          match.elapsed !== null ? duration(match.elapsed) : null,
          t.spectators(match.spectators),
        )}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/directo" className="text-sm text-brass hover:underline">
          {t.backLive}
        </Link>
        <CopyCode code={String(match.matchId)} label={t.matchId} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div>
          <div className="mb-6 flex items-center gap-3 text-sm">
            <span className="w-14 text-right">{souls(a)}</span>
            <span
              className="relative h-2 flex-1 bg-wine-raised"
              role="img"
              aria-label={t.soulsVs(souls(a), souls(b))}
            >
              <span className="absolute inset-y-0 left-0 bg-brass" style={{ width: `${share * 100}%` }} />
            </span>
            <span className="w-14">{souls(b)}</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {([0, 1] as const).map((tm) => (
              <Team key={tm} index={tm} players={match.teams[tm]} names={names} heroes={byId} />
            ))}
          </div>
        </div>

        <figure>
          {map ? (
            <div className="relative aspect-square w-full overflow-hidden border border-brass-dim/40 bg-ox-deep">
              <Image src={map.image} alt={t.mapAlt} fill sizes="420px" className="object-contain" />
            </div>
          ) : (
            <Unavailable what={t.mapWhat} />
          )}
          <figcaption className="mt-2 text-xs text-ivory-dim">
            {t.mapCaption}
          </figcaption>
        </figure>
      </div>
    </>
  );
}

async function Team({
  index,
  players,
  names,
  heroes,
}: {
  index: 0 | 1;
  players: ActivePlayer[];
  names: Record<number, string>;
  heroes: Map<number, { id: number; name: string; card: string; small: string }>;
}) {
  const t = (await getT()).matches.live;
  return (
    <div className="min-w-0">
      <h2 className="border-b border-brass-dim/40 pb-1 font-display text-lg tracking-[0.12em] text-brass">
        {t.teamNames[index].toUpperCase()}
      </h2>
      <ul>
        {players.map((p) => {
          const hero = heroes.get(p.heroId);
          return (
            <li key={p.accountId} className="flex items-center gap-3 border-b border-brass-dim/20 py-2">
              <HeroIcon hero={hero} size={36} />
              <div className="min-w-0 leading-tight">
                <Link href={`/jugadores/${p.accountId}`} className="block truncate hover:text-brass">
                  {names[p.accountId] ?? t.player(p.accountId)}
                </Link>
                <span className="block truncate text-xs text-ivory-dim">{hero?.name ?? "—"}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
