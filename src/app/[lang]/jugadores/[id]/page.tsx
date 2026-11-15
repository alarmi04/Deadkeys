import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Dial } from "@/components/Dial";
import { HeroIcon } from "@/components/HeroIcon";
import { ClockIcon, ListIcon, ScrollIcon, SteamIcon, SwordsIcon, UserIcon, UsersIcon } from "@/components/Icons";
import { Sparkline } from "@/components/Sparkline";
import {
  type MatchRow,
  getHeroes,
  getMatchHistory,
  getPlayerMates,
  getPlayerRank,
  getRanks,
  getSteamProfile,
  getSteamProfiles,
  rankImage,
  safe,
} from "@/lib/api";
import { kda } from "@/lib/format";
import { summarize } from "@/lib/stats";

export async function generateMetadata({ params }: PageProps<"/[lang]/jugadores/[id]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).players.profile;
  return pageMeta({ lang, path: "/jugadores", title: t.metaTitle, description: t.metaDesc, noindex: true });
}

const PER_PAGE = 25;

type Mode = "todas" | "ranked" | "normal";
const MODE_IDS: Mode[] = ["todas", "ranked", "normal"];

/** Hora actual, fuera del componente: la página se renderiza por petición, no se cachea. */
const currentTime = () => Date.now();

const perMin = (m: MatchRow) => m.netWorth / Math.max(m.duration / 60, 1);

/** Color del KDA por tramos, de peor a mejor. */
const kdaTone = (v: number) =>
  v >= 4 ? "text-brass" : v >= 2.5 ? "text-win" : v < 1.5 ? "text-loss" : "text-ivory";

/** Compañeros habituales junto con su perfil de Steam; si la API falla, la sección simplemente no aparece. */
async function loadMates(accountId: number) {
  const list = (await safe(getPlayerMates(accountId))) ?? [];
  const profiles = list.length ? ((await safe(getSteamProfiles(list.map((m) => m.accountId)))) ?? {}) : {};
  return list.map((m) => ({ ...m, profile: profiles[m.accountId] }));
}

export default function PlayerPage({ params, searchParams }: PageProps<"/[lang]/jugadores/[id]">) {
  return (
    <main className="mx-auto max-w-[1320px] px-4 sm:px-8">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Profile({
  params,
  searchParams,
}: {
  params: PageProps<"/[lang]/jugadores/[id]">["params"];
  searchParams: PageProps<"/[lang]/jugadores/[id]">["searchParams"];
}) {
  const m = await getT();
  const t = m.players.profile;
  const { ago, dayKey, dayLabel, duration, num, pct, souls } = await getFormat();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const accountId = Number(id);
  if (!Number.isInteger(accountId) || accountId <= 0 || accountId > 2 ** 31) notFound();

  const [profile, rank, ranks, heroes, history, mates] = await Promise.all([
    safe(getSteamProfile(accountId)),
    safe(getPlayerRank(accountId)),
    safe(getRanks()),
    safe(getHeroes()),
    safe(getMatchHistory(accountId)),
    loadMates(accountId),
  ]);
  if (!profile && !history?.length) notFound();

  await connection(); // dato dinámico: a partir de aquí se renderiza por petición
  const now = currentTime();
  const byId = new Map((heroes ?? []).map((h) => [h.id, h]));
  const everything = history ?? [];
  const mode: Mode = sp.modo === "ranked" || sp.modo === "normal" ? sp.modo : "todas";
  const all = everything.filter((m) => (mode === "ranked" ? m.ranked : mode === "normal" ? !m.ranked : true));
  const recent = all.slice(0, 20);
  const chrono = [...recent].reverse();
  const overall = summarize(all);
  const last = summarize(recent);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const requested = Number(typeof sp.pagina === "string" ? sp.pagina : 1);
  const page = Number.isInteger(requested) ? Math.min(pages, Math.max(1, requested)) : 1;
  const rows = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const rankInfo = rank && ranks ? ranks.find((r) => r.tier === rank.tier) : undefined;
  const rankImg = rank && ranks ? rankImage(ranks, rank.tier, rank.subrank) : null;

  // Héroes más jugados, calculados sobre el modo elegido para que cuadren con el resto de cifras.
  const heroAgg = new Map<number, MatchRow[]>();
  for (const m of all) heroAgg.set(m.heroId, [...(heroAgg.get(m.heroId) ?? []), m]);
  const topHeroes = [...heroAgg.entries()]
    .map(([heroId, ms]) => ({ heroId, ...summarize(ms) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  // Partidas de la página agrupadas por día (hora de Madrid), de más reciente a más antigua.
  const days: { key: string; label: string; items: MatchRow[] }[] = [];
  for (const m of rows) {
    const key = dayKey(m.start);
    const cur = days[days.length - 1];
    if (cur?.key === key) cur.items.push(m);
    else days.push({ key, label: dayLabel(m.start), items: [m] });
  }

  const overview: { label: string; value: string; tone?: string }[] = [
    { label: t.overview.wins, value: num(overall.wins), tone: "text-win" },
    { label: t.overview.losses, value: num(overall.losses), tone: "text-loss" },
    { label: t.overview.kd, value: num(overall.kd, 2) },
    { label: t.overview.soulsMin, value: num(overall.soulsPerMin) },
    { label: t.overview.lastHitsAvg, value: num(overall.lastHitsAvg, 1) },
    { label: t.overview.lastHitsMin, value: num(overall.lastHitsPerMin, 1) },
    { label: t.overview.soulsAvg, value: souls(overall.soulsAvg) },
    { label: t.overview.durationAvg, value: duration(Math.round(overall.durationAvg)) },
  ];

  const trends: { title: string; value: string; values: number[]; label: string }[] = [
    {
      title: t.trends.wins,
      value: pct(last.winRate, 0),
      values: chrono.map((_, i) => chrono.slice(0, i + 1).filter((m) => m.won).length / (i + 1)),
      label: t.trends.winsLabel,
    },
    {
      title: t.trends.kda,
      value: num(last.kda, 2),
      values: chrono.map((m) => kda(m.kills, m.deaths, m.assists)),
      label: t.trends.kdaLabel,
    },
    {
      title: t.trends.souls,
      value: souls(last.soulsAvg),
      values: chrono.map((m) => m.netWorth),
      label: t.trends.soulsLabel,
    },
    {
      title: t.trends.soulsMin,
      value: num(last.soulsPerMin),
      values: chrono.map(perMin),
      label: t.trends.soulsMinLabel,
    },
  ];

  return (
    <>
      <section className="deco-frame mt-8 flex flex-col gap-8 bg-[linear-gradient(180deg,var(--wine-raised),var(--ox))] px-6 py-10 sm:flex-row sm:items-center sm:px-12">
        {profile && (
          <Image
            src={profile.avatarFull}
            alt=""
            width={112}
            height={112}
            priority
            className="border border-brass"
          />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="break-words font-display text-[clamp(2rem,1.3rem+2.4vw,3.2rem)] leading-tight tracking-[0.08em] text-brass">
            {profile?.name ?? t.account(accountId)}
          </h1>
          <p className="mt-1 text-ivory-dim">
            ID {accountId}
            {profile?.country && ` · ${profile.country}`}
            {profile && (
              <>
                {" · "}
                <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="text-brass underline">
                  {t.steamProfile}
                </a>
              </>
            )}
            {" · "}
            <Link href={`/tracker?a=${accountId}`} className="text-brass underline">
              {t.rankingCompare}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-4">
          {rankImg && <Image src={rankImg} alt="" width={72} height={72} />}
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-ivory-dim">{t.rank}</p>
            <p className="text-2xl font-semibold">
              {rankInfo ? `${rankInfo.name} ${rank?.subrank}` : t.unranked}
            </p>
          </div>
        </div>
      </section>

      <nav aria-label={t.modeAria} className="mt-8 grid grid-cols-3 border border-brass-dim">
        {MODE_IDS.map((id) => {
          const on = id === mode;
          return (
            <Link
              key={id}
              href={id === "todas" ? `/jugadores/${accountId}` : `/jugadores/${accountId}?modo=${id}`}
              aria-current={on ? "page" : undefined}
              className={`px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-[0.14em] no-underline transition-colors ${
                on ? "bg-brass text-ox-deep" : "text-ivory-dim hover:bg-wine hover:text-ivory"
              }`}
            >
              {t.modes[id]}
            </Link>
          );
        })}
      </nav>

      {all.length === 0 ? (
        <p className="mt-10 text-ivory-dim">
          {everything.length === 0
            ? t.noMatches
            : t.noModeMatches}
        </p>
      ) : (
        <div className="mt-10 grid gap-x-10 gap-y-12 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside>
            <h2 className="section-title"><SwordsIcon />{t.heroes}</h2>
            <p className="mt-2 text-sm text-ivory-dim">{t.mostPlayed(num(all.length))}</p>
            <ul className="panel mt-5">
              {topHeroes.map((h) => (
                <li
                  key={h.heroId}
                  className="flex items-center gap-3 border-b border-brass/15 px-3 py-3 last:border-b-0"
                >
                  <HeroIcon hero={byId.get(h.heroId)} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{byId.get(h.heroId)?.name ?? h.heroId}</p>
                    <p className="text-sm text-ivory-dim">
                      <span className={h.winRate >= 0.5 ? "text-win" : "text-loss"}>{pct(h.winRate, 0)}</span>
                      {" · "}
                      {t.wl(h.wins, h.losses)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${kdaTone(h.kda)}`}>{num(h.kda, 2)}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-ivory-dim">KDA</p>
                  </div>
                </li>
              ))}
            </ul>

            {mates.length > 0 && (
              <>
                <h2 className="section-title mt-12"><UsersIcon />{t.mates}</h2>
                <p className="mt-2 text-sm text-ivory-dim">{t.matesHint}</p>
                <ul className="panel mt-5">
                  {mates.map((mate) => {
                    const wr = mate.wins / mate.matches;
                    const name = mate.profile?.name ?? t.account(mate.accountId);
                    const btn =
                      "grid size-9 place-items-center border border-brass-dim text-brass transition-colors hover:border-brass hover:bg-wine hover:text-ivory";
                    return (
                      <li
                        key={mate.accountId}
                        className="flex items-center gap-3 border-b border-brass/15 px-3 py-3.5 last:border-b-0"
                      >
                        {mate.profile ? (
                          <Image src={mate.profile.avatar} alt="" width={48} height={48} className="border border-brass-dim" />
                        ) : (
                          <span className="size-12 shrink-0 bg-wine" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{name}</p>
                          <p className="mt-0.5 whitespace-nowrap text-sm text-ivory-dim">
                            {t.matchesCount(num(mate.matches))} ·{" "}
                            <span className={wr >= 0.5 ? "text-win" : "text-loss"}>{pct(wr, 0)}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Link
                            href={`/jugadores/${mate.accountId}`}
                            className={btn}
                            aria-label={t.viewProfileOf(name)}
                            title={t.viewProfile}
                          >
                            <UserIcon />
                          </Link>
                          {mate.profile && (
                            <a
                              href={mate.profile.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={btn}
                              aria-label={t.steamOf(name)}
                              title={t.steamProfile}
                            >
                              <SteamIcon />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </aside>

          <div className="min-w-0">
            <h2 className="section-title"><ListIcon />{t.summary}</h2>
            <p className="mt-2 text-sm text-ivory-dim">
              {t.summaryCount(num(overall.n), mode === "ranked" ? t.modeRanked : mode === "normal" ? t.modeNormal : "")}
            </p>
            <div className="panel mt-5 grid gap-x-8 gap-y-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="flex items-center gap-6 sm:flex-col sm:gap-1">
                <Dial value={overall.winRate} label={t.winsLabel(pct(overall.winRate))} size={150} />
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.14em] text-ivory-dim">KDA</p>
                  <p className={`text-3xl font-semibold ${kdaTone(overall.kda)}`}>{num(overall.kda, 2)}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                {overview.map((o) => (
                  <div key={o.label} className="border-t border-brass/25 pt-2">
                    <dt className="text-xs uppercase tracking-[0.12em] text-ivory-dim">{o.label}</dt>
                    <dd className={`text-xl font-semibold ${o.tone ?? ""}`}>{o.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <h2 className="section-title mt-12"><ClockIcon />{t.trends.recent(recent.length)}</h2>
            <div className="panel mt-5 grid grid-cols-2 lg:grid-cols-4">
              {trends.map((tr, i) => (
                <div
                  key={tr.title}
                  className={`border-brass/20 px-4 py-4 ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "border-t" : ""} lg:border-t-0 ${i > 0 ? "lg:border-l" : ""}`}
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-ivory-dim">{tr.title}</p>
                  <p className="mb-2 text-2xl font-semibold">{tr.value}</p>
                  <Sparkline values={tr.values} label={tr.label} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ivory-dim">{t.trends.order}</p>

            <section id="historial" className="mt-12 scroll-mt-8">
              <h2 className="section-title"><ScrollIcon />{t.history}</h2>
              <div className="match-row match-head mt-5 hidden !border-b-0 !pb-2 sm:grid" aria-hidden="true">
                <span>{t.colMatch}</span>
                <span className="text-right">{t.colKda}</span>
                <span className="text-right">{t.colRatio}</span>
                <span className="text-right">{t.colSouls}</span>
                <span className="text-right">{t.colSoulsMin}</span>
              </div>
              <div className="mt-5 border-t border-brass sm:mt-0">
                {days.map((d) => {
                  const s = summarize(d.items);
                  return (
                    <section key={d.key} aria-label={d.label}>
                      <div className="match-row match-head !bg-ox-deep/60 !py-2">
                        <span className="text-brass">
                          {d.label} <span className="text-ivory-dim">· {s.n}</span>
                        </span>
                        <span className="text-right">
                          <span className="text-win">{s.wins}{t.winsShort}</span> / <span className="text-loss">{s.losses}{t.lossesShort}</span>
                        </span>
                        <span className="text-right">{num(s.kda, 2)}</span>
                        <span className="hidden text-right sm:block">{souls(s.soulsAvg)}</span>
                        <span className="hidden text-right sm:block">{num(s.soulsPerMin)}</span>
                      </div>
                      <ol>
                        {d.items.map((mt) => {
                          const hero = byId.get(mt.heroId);
                          const k = kda(mt.kills, mt.deaths, mt.assists);
                          return (
                            <li key={mt.matchId} className="match-row relative" data-won={mt.won}>
                              <div className="flex min-w-0 items-center gap-3">
                                <HeroIcon hero={hero} size={44} />
                                <div className="min-w-0">
                                  <p className="truncate">
                                    <Link
                                      href={`/partidas/${mt.matchId}?jugador=${accountId}`}
                                      className="font-semibold no-underline after:absolute after:inset-0 hover:text-brass"
                                      aria-label={t.viewMatch(hero?.name ?? String(mt.heroId), mt.won)}
                                    >
                                      {hero?.name ?? mt.heroId}
                                    </Link>
                                    <span className={`ml-2 text-sm font-semibold ${mt.won ? "text-win" : "text-loss"}`}>
                                      {mt.won ? t.win : t.loss}
                                    </span>
                                    {mt.ranked && (
                                      <span className="ml-2 text-xs uppercase tracking-[0.1em] text-brass">{t.ranked}</span>
                                    )}
                                    {mt.abandoned && (
                                      <span className="ml-2 text-xs uppercase tracking-[0.1em] text-ivory-dim">
                                        {t.abandoned}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-ivory-dim">
                                    {ago(mt.start, now)} · {duration(mt.duration)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-right font-semibold">
                                {mt.kills} / {mt.deaths} / {mt.assists}
                              </span>
                              <span className={`text-right font-semibold ${kdaTone(k)}`}>{num(k, 2)}</span>
                              <span className="hidden text-right sm:block">{souls(mt.netWorth)}</span>
                              <span className="hidden text-right text-ivory-dim sm:block">{num(perMin(mt))}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  );
                })}
              </div>
              <Pager accountId={accountId} page={page} pages={pages} total={all.length} mode={mode} />
              <p className="mt-3 text-xs text-ivory-dim">
                {t.incomplete}
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}

async function Pager({
  accountId,
  page,
  pages,
  total,
  mode,
}: {
  accountId: number;
  page: number;
  pages: number;
  total: number;
  mode: Mode;
}) {
  const t = (await getT()).players.profile;
  const { num } = await getFormat();
  const href = (p: number) =>
    `/jugadores/${accountId}?${mode === "todas" ? "" : `modo=${mode}&`}pagina=${p}#historial`;
  const btn =
    "border px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.12em] no-underline transition-colors";
  const on = `${btn} border-brass-dim text-ivory hover:border-brass hover:text-brass`;
  const off = `${btn} border-brass-dim/40 text-ivory-dim/50`;
  const from = (page - 1) * PER_PAGE + 1;
  const to = Math.min(total, page * PER_PAGE);

  return (
    <nav aria-label={t.pagerAria} className="mt-5 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-ivory-dim">
        {t.pagerRange(num(from), num(to), num(total))}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <>
            <Link href={href(1)} className={on}>
              {t.first}
            </Link>
            <Link href={href(page - 1)} className={on} rel="prev">
              {t.prev}
            </Link>
          </>
        ) : (
          <>
            <span className={off}>{t.first}</span>
            <span className={off}>{t.prev}</span>
          </>
        )}
        <span className="px-2 text-sm text-ivory">
          {num(page)} / {num(pages)}
        </span>
        {page < pages ? (
          <>
            <Link href={href(page + 1)} className={on} rel="next">
              {t.next}
            </Link>
            <Link href={href(pages)} className={on}>
              {t.last}
            </Link>
          </>
        ) : (
          <>
            <span className={off}>{t.next}</span>
            <span className={off}>{t.last}</span>
          </>
        )}
      </div>
    </nav>
  );
}

async function ProfileSkeleton() {
  const t = (await getT()).players.profile;
  return (
    <div aria-busy="true" aria-label={t.loadingAria}>
      <LoadingState label={t.loading} className="mt-8" />
      <div className="deco-frame mt-8 flex items-center gap-8 px-12 py-10">
        <span className="size-28 bg-wine/60" />
        <span className="h-10 w-80 bg-wine/40" />
      </div>
    </div>
  );
}
