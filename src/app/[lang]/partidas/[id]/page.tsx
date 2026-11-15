import { TrendIcon, UsersIcon, BanIcon } from "@/components/Icons";
import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CopyCode } from "@/components/CopyCode";
import { HeroIcon } from "@/components/HeroIcon";
import { PageHeader } from "@/components/PageHeader";
import { ScoreTable } from "@/components/ScoreTable";
import { TeamMark } from "@/components/TeamMark";
import {
  type MatchDetail,
  type MatchPlayer,
  type Rank,
  getHeroes,
  getItems,
  getMatchDetail,
  getRanks,
  getSteamProfiles,
  safe,
} from "@/lib/api";

/** Hora actual, fuera del componente: la página se renderiza por petición, no se cachea. */
const currentTime = () => Date.now();

export async function generateMetadata({ params }: PageProps<"/[lang]/partidas/[id]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).matches.match;
  return pageMeta({ lang, path: "/partidas", title: t.metaTitle, description: t.metaDesc, noindex: true });
}

export default async function MatchPage({ params, searchParams }: PageProps<"/[lang]/partidas/[id]">) {
  const l = (await getT()).matches.live;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-12 sm:px-8">
      <Suspense
        fallback={
          <>
            <PageHeader title={l.match} />
            <LoadingState label={l.loadingMatch} />
          </>
        }
      >
        <Match params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Match({
  params,
  searchParams,
}: {
  params: PageProps<"/[lang]/partidas/[id]">["params"];
  searchParams: PageProps<"/[lang]/partidas/[id]">["searchParams"];
}) {
  const m = await getT();
  const t = m.matches.match;
  const live = m.matches.live;
  const { ago, dateTime, duration, souls } = await getFormat();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();

  const focusRaw = Number(typeof sp.jugador === "string" ? sp.jugador : NaN);
  const focus = Number.isInteger(focusRaw) ? focusRaw : null;
  const back = focus ? `/jugadores/${focus}#historial` : "/jugadores";

  const [match, heroes, items, ranks] = await Promise.all([
    safe(getMatchDetail(matchId)),
    safe(getHeroes()),
    safe(getItems(m.lang)),
    safe(getRanks()),
  ]);

  if (!match) {
    return (
      <>
        <PageHeader title={live.matchN(matchId)} />
        <p className="mt-8 max-w-[60ch] text-ivory-dim">{t.missing}</p>
        <Link href={back} className="mt-4 inline-block text-brass hover:underline">
          {t.backHistory}
        </Link>
      </>
    );
  }

  await connection(); // "hace X" depende de la hora actual
  const now = currentTime();
  const profiles = (await safe(getSteamProfiles(match.players.map((p) => p.accountId)))) ?? {};
  const heroById = new Map((heroes ?? []).map((h) => [h.id, h]));
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const teams = ([0, 1] as const).map((t) => match.players.filter((p) => p.team === t));
  const totals = teams.map((ps) => ({
    kills: ps.reduce((a, p) => a + p.kills, 0),
    deaths: ps.reduce((a, p) => a + p.deaths, 0),
    assists: ps.reduce((a, p) => a + p.assists, 0),
    souls: ps.reduce((a, p) => a + p.netWorth, 0),
    damage: ps.reduce((a, p) => a + p.damage, 0),
  }));
  const top = (f: (p: MatchPlayer) => number) => Math.max(0, ...match.players.map(f));
  const best = {
    souls: top((p) => p.netWorth),
    kills: top((p) => p.kills),
    assists: top((p) => p.assists),
    damage: top((p) => p.damage),
    boss: top((p) => p.bossDamage),
    healing: top((p) => p.healing),
  };
  const kind = match.ranked ? t.ranked : (match.mode ?? t.defaultKind);
  const teamNames = live.teamNames;

  return (
    <>
      <PageHeader
        title={live.matchN(match.matchId)}
        intro={`${kind} · ${duration(match.duration)} · ${dateTime(match.start)} (${ago(match.start, now)})`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href={back} className="text-sm text-brass hover:underline">
          {t.backHistory}
        </Link>
        <CopyCode code={String(match.matchId)} label={live.matchId} />
      </div>

      <section aria-label={t.result} className="deco-frame mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[linear-gradient(180deg,var(--wine-raised),var(--ox))] px-5 py-8 sm:px-12">
        {([0, 1] as const).map((tm) => {
          const won = match.winner === tm;
          return (
            <div key={tm} className={`min-w-0 ${tm === 0 ? "text-left" : "col-start-3 row-start-1 text-right"}`}>
              <p className="mb-1">
                <TeamMark team={tm} lang={m.lang} height={64} />
              </p>
              <p className={`text-lg font-semibold ${won ? "text-win" : "text-loss"}`}>{won ? t.win : t.loss}</p>
              <p className="mt-1 text-sm text-ivory-dim">
                {totals[tm].kills} / {totals[tm].deaths} / {totals[tm].assists} · {t.soulsOf(souls(totals[tm].souls))}
              </p>
              <p className="text-sm text-ivory-dim">{t.avgRank(badgeName(match.badges[tm], ranks))}</p>
            </div>
          );
        })}
        <p className="col-start-2 row-start-1 font-display text-2xl tracking-[0.2em] text-ivory-dim">VS</p>
      </section>

      {match.times.length > 1 && (
        <section className="mt-12">
          <h2 className="section-title"><TrendIcon />{t.lead}</h2>
          <p className="mt-2 text-sm text-ivory-dim">{t.leadHint(teamNames[0], teamNames[1])}</p>
          <LeadChart match={match} />
        </section>
      )}

      <section className="mt-12">
        <h2 className="section-title"><UsersIcon />{t.players}</h2>
        {([0, 1] as const).map((tm) => (
          <ScoreTable
            key={tm}
            team={tm}
            won={match.winner === tm}
            players={teams[tm]}
            total={totals[tm].souls}
            best={best}
            focus={focus}
            heroes={heroById}
            items={itemById}
            names={Object.fromEntries(Object.entries(profiles).map(([k, v]) => [k, v.name]))}
          />
        ))}
        <p className="mt-3 text-xs text-ivory-dim">
          {t.kdaHint}
        </p>
      </section>

      {match.banned.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title"><BanIcon />{t.banned}</h2>
          <ul className="mt-5 flex flex-wrap gap-3">
            {match.banned.map((h) => (
              <li key={h} className="flex items-center gap-2 border border-brass-dim/40 bg-ox-deep/50 py-1 pl-1 pr-3">
                <HeroIcon hero={heroById.get(h)} size={32} />
                <span className="text-sm">{heroById.get(h)?.name ?? h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function badgeName(badge: number | null, ranks: Rank[] | null) {
  if (!badge) return "—";
  const tier = Math.floor(badge / 10);
  const sub = badge % 10;
  const name = ranks?.find((r) => r.tier === tier)?.name;
  return name ? `${name} ${sub}` : "—";
}

/** Diferencia de almas (Ámbar − Zafiro) en cada instantánea, con eje en minutos. */
async function LeadChart({ match }: { match: MatchDetail }) {
  const m = await getT();
  const t = m.matches.match;
  const teamNames = m.matches.live.teamNames;
  const { souls } = await getFormat();
  const diffs = match.times.map((_, i) => {
    const sum = (t: 0 | 1) => match.players.filter((p) => p.team === t).reduce((a, p) => a + (p.series[i] ?? 0), 0);
    return sum(0) - sum(1);
  });
  const W = 800;
  const H = 220;
  const padX = 8;
  const max = Math.max(1000, ...diffs.map(Math.abs));
  const x = (i: number) => padX + (match.times[i] / match.times[match.times.length - 1]) * (W - padX * 2);
  const y = (v: number) => H / 2 - (v / max) * (H / 2 - 14);
  const line = diffs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(0)},${H / 2} ${line} ${x(diffs.length - 1)},${H / 2}`;
  const final = diffs[diffs.length - 1];
  return (
    <figure className="panel mt-5 p-4">
      <svg
        viewBox={`0 0 ${W} ${H + 22}`}
        className="h-auto w-full"
        role="img"
        aria-label={t.leadAria(final >= 0 ? teamNames[0] : teamNames[1], souls(Math.abs(final)))}
      >
        <line x1={padX} x2={W - padX} y1={H / 2} y2={H / 2} stroke="var(--brass-dim)" strokeWidth="1" />
        <polygon points={area} fill="var(--brass)" fillOpacity="0.14" />
        <polyline points={line} fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinejoin="round" />
        {diffs.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--ivory)" />
        ))}
        <text x={padX} y="12" fontSize="12" fill="var(--ivory-dim)">
          {teamNames[0]} +{souls(max)}
        </text>
        <text x={padX} y={H - 4} fontSize="12" fill="var(--ivory-dim)">
          {teamNames[1]} +{souls(max)}
        </text>
        {match.times.map((tt, i) =>
          i === 0 || i % 2 === 1 || i === match.times.length - 1 ? (
            <text
              key={tt}
              x={x(i)}
              y={H + 16}
              fontSize="12"
              fill="var(--ivory-dim)"
              textAnchor={i === match.times.length - 1 ? "end" : "middle"}
            >
              {Math.round(tt / 60)} {t.min}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}
