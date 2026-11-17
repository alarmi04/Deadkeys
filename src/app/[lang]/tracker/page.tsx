import { LoadingState } from "@/components/Spinner";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getMessages, getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { pageMeta } from "@/lib/seo";
import Image from "next/image";
import Link from "@/components/Link";
import { Suspense } from "react";
import { ComparePicker } from "@/components/ComparePicker";
import { HeroIcon } from "@/components/HeroIcon";
import { PageHeader } from "@/components/PageHeader";
import { PlayerProfile, loadProfile } from "@/components/PlayerProfile";
import { RankLadder } from "@/components/RankLadder";
import { RecentPlayers, RememberPlayer } from "@/components/RecentPlayers";
import {
  type Hero,
  type LeaderboardEntry,
  type LeaderboardSpot,
  type MatchRow,
  type PlayerRank,
  REGIONS,
  type Rank,
  type Region,
  type RankBin,
  type SteamProfile,
  getHeroes,
  getLeaderboard,
  getLeaderboardIndex,
  getMatchHistory,
  getPlayerRank,
  getRankDistribution,
  getRanks,
  getSteamProfile,
  rankImage,
  safe,
} from "@/lib/api";
import type { Format } from "@/lib/format";
import { summarize } from "@/lib/stats";
import { headToHead, rankStep, recentForm, standing } from "@/lib/tracker";

export async function generateMetadata({ params }: PageProps<"/[lang]/tracker">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getMessages(lang).tracker;
  return pageMeta({ lang, path: "/tracker", title: t.metaTitle, description: t.metaDesc });
}

const BASE = "/tracker";

type Mode = "todas" | "ranked" | "normal";
const MODE_IDS: Mode[] = ["todas", "ranked", "normal"];

type Slot = "a" | "b";
type Summary = ReturnType<typeof summarize>;

type Player = {
  accountId: number;
  name: string;
  profile: SteamProfile | null;
  rank: PlayerRank | null;
  history: MatchRow[];
  spot: LeaderboardSpot | null;
};

const SLOT = {
  a: { n: "1", bg: "bg-pa", text: "text-pa" },
  b: { n: "2", bg: "bg-pb", text: "text-pb" },
} as const;

/** Un ID válido de cuenta de Steam (32 bits); cualquier otra cosa deja el hueco vacío. */
function parseId(v: string | string[] | undefined) {
  const n = typeof v === "string" ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 2 ** 31 ? n : null;
}

async function loadPlayer(
  accountId: number,
  board: Record<number, LeaderboardSpot> | null,
  accountLabel: (id: number) => string,
): Promise<Player | null> {
  const [profile, rank, history] = await Promise.all([
    safe(getSteamProfile(accountId)),
    safe(getPlayerRank(accountId)),
    safe(getMatchHistory(accountId)),
  ]);
  if (!profile && !history?.length) return null;
  // El ID es solo uno de los candidatos de cada entrada: se acepta si además el nombre coincide.
  const cand = board?.[accountId];
  const same = cand && profile && cand.name.trim().toLowerCase() === profile.name.trim().toLowerCase();
  return { accountId, name: profile?.name ?? accountLabel(accountId), profile, rank, history: history ?? [], spot: same ? cand : null };
}

const nameOf = (p: Player) => p.name;
const rankNameOf = (ranks: Rank[], r: PlayerRank | null, unranked: string) => {
  const info = r ? ranks.find((x) => x.tier === r.tier) : undefined;
  return r && info ? `${info.name} ${r.subrank}` : unranked;
};

export default async function TrackerPage({ searchParams }: PageProps<"/[lang]/tracker">) {
  const t = (await getT()).tracker;
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-16 sm:px-8">
      <PageHeader title={t.title} intro={t.intro} />
      <Suspense fallback={<LoadingState label={t.loading} className="mt-8" />}>
        <Tracker searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type View = "jugador" | "comparar" | "clasificacion";
const VIEW_IDS: View[] = ["jugador", "comparar", "clasificacion"];

async function Tracker({ searchParams }: { searchParams: PageProps<"/[lang]/tracker">["searchParams"] }) {
  const m = await getT();
  const t = m.tracker;
  const sp = await searchParams;
  const asked = { a: parseId(sp.a), b: parseId(sp.b) };
  const mode: Mode = sp.modo === "ranked" || sp.modo === "normal" ? sp.modo : "todas";
  const view: View =
    sp.vista === "clasificacion"
      ? "clasificacion"
      : sp.vista === "comparar" || (!sp.vista && asked.b)
        ? "comparar"
        : "jugador";
  const region: Region = typeof sp.region === "string" && sp.region in REGIONS ? (sp.region as Region) : "Europe";
  const reqPage = Number(typeof sp.pagina === "string" ? sp.pagina : 1);
  const page = Number.isInteger(reqPage) && reqPage > 1 ? reqPage : 1;
  // Solo la vista de comparar usa al segundo jugador.
  const ids = { a: asked.a, b: view === "comparar" ? asked.b : null };

  const board = ids.a || ids.b ? await safe(getLeaderboardIndex()) : null;
  const [pa, pb, ranks, heroes, dist, entries, full] = await Promise.all([
    ids.a ? loadPlayer(ids.a, board, m.players.profile.account) : null,
    ids.b ? loadPlayer(ids.b, board, m.players.profile.account) : null,
    safe(getRanks()),
    safe(getHeroes()),
    ids.a || ids.b || view === "clasificacion" ? safe(getRankDistribution()) : null,
    view === "clasificacion" ? safe(getLeaderboard(region, 500)) : null,
    // La vista de un jugador muestra su perfil completo, el mismo que /jugadores/[id].
    view === "jugador" && ids.a ? loadProfile(ids.a) : null,
  ]);
  const players = { a: pa, b: pb };
  // IDs que se pidieron pero no existen o no responden: se avisa en su hueco.
  const missing = { a: ids.a !== null && !pa, b: ids.b !== null && !pb };
  const loaded = [pa, pb].filter((p): p is Player => !!p);

  const params = (over: Partial<Record<"a" | "b" | "modo" | "vista" | "region" | "pagina", string | null>>) => {
    const base: Record<string, string | null | undefined> = {
      a: ids.a?.toString(),
      b: ids.b?.toString(),
      vista: view === "jugador" ? null : view,
      modo: mode === "todas" ? null : mode,
      region: view === "clasificacion" && region !== "Europe" ? region : null,
      // Página de la clasificación, o del historial en la vista de un jugador.
      pagina: view !== "comparar" && page > 1 ? String(page) : null,
      ...over,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return p;
  };
  const query = (over: Parameters<typeof params>[0]) => {
    const s = params(over).toString();
    return s ? `${BASE}?${s}` : BASE;
  };
  /** Parámetros que conserva el buscador de un hueco al elegir jugador (todos menos el suyo). */
  const others = (slot: Slot) => Object.fromEntries(params({ [slot]: null }));

  const filtered = (p: Player) =>
    p.history.filter((m) => (mode === "ranked" ? m.ranked : mode === "normal" ? !m.ranked : true));
  const both = pa && pb ? { a: pa, b: pb } : null;
  const modeHref = (m: Mode) => query({ modo: m === "todas" ? null : m, pagina: null });
  const slotProps = (slot: Slot, label?: string) => ({
    slot,
    player: players[slot],
    missing: missing[slot],
    ranks: ranks ?? [],
    clearHref: query({ [slot]: null }),
    others: others(slot),
    exclude: loaded.map((p) => p.accountId),
    alone: !pa && !pb,
    label,
  });

  return (
    <>
      {loaded.map((p) => (
        <RememberPlayer
          key={p.accountId}
          player={{ id: p.accountId, name: nameOf(p), avatar: p.profile?.avatar ?? null }}
        />
      ))}

      <nav aria-label={t.viewsAria} className="mt-8 grid max-w-2xl grid-cols-[repeat(3,auto)] border border-brass sm:grid-cols-3">
        {VIEW_IDS.map((vid) => {
          const on = vid === view;
          const href =
            vid === "jugador"
              ? query({ vista: null, b: null, region: null, pagina: null })
              : vid === "comparar"
                ? query({ vista: "comparar", region: null, pagina: null, b: asked.b?.toString() })
                : query({ vista: "clasificacion", b: null, pagina: null });
          return (
            <Link
              key={vid}
              href={href}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.1em] no-underline transition-colors sm:px-4 sm:text-sm sm:tracking-[0.16em] ${
                on ? "bg-brass text-ox-deep" : "text-ivory hover:bg-wine hover:text-brass"
              }`}
            >
              {t.views[vid]}
            </Link>
          );
        })}
      </nav>

      {view === "comparar" ? (
        <>
          <div className="mt-10 grid gap-8 md:grid-cols-[1fr_9rem_1fr] md:items-start md:gap-6">
            {(["a", "b"] as const).map((slot) => (
              <div
                key={slot}
                className={slot === "b" ? "md:col-start-3 md:row-start-1" : "md:col-start-1 md:row-start-1"}
              >
                <PlayerSlot {...slotProps(slot)} />
              </div>
            ))}
            <div className="flex items-center justify-center md:col-start-2 md:row-start-1 md:min-h-[7rem]">
              {both ? (
                <Link
                  href={query({ a: ids.b?.toString(), b: ids.a?.toString() })}
                  scroll={false}
                  className="border border-brass-dim px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim no-underline transition-colors hover:border-brass hover:text-brass"
                >
                  {t.swap}
                </Link>
              ) : (
                <span className="font-display text-3xl tracking-[0.12em] text-brass-dim" aria-hidden="true">
                  VS
                </span>
              )}
            </div>
          </div>

          {loaded.length === 0 ? (
            <p className="mt-10 max-w-[64ch] text-ivory-dim">{t.compareEmpty}</p>
          ) : (
            <>
              <Standing
                players={loaded.map((p) => ({ slot: p === pa ? ("a" as const) : ("b" as const), p }))}
                ranks={ranks ?? []}
                dist={dist}
                both={!!both}
              />
              {both ? (
                <Duel
                  a={both.a}
                  b={both.b}
                  matchesA={filtered(both.a)}
                  matchesB={filtered(both.b)}
                  mode={mode}
                  heroes={heroes ?? []}
                  hrefFor={modeHref}
                />
              ) : (
                <p className="mt-10 max-w-[64ch] text-ivory-dim">{t.compareMissing}</p>
              )}
            </>
          )}
        </>
      ) : view === "clasificacion" ? (
        <>
          <div className="mt-10 max-w-[40rem]">
            <PlayerSlot {...slotProps("a", t.highlightPlayer)} />
          </div>
          <Leaderboard
            region={region}
            entries={entries}
            heroes={heroes ?? []}
            ranks={ranks ?? []}
            dist={dist}
            player={pa}
            page={page}
            regionHref={(r) => query({ region: r === "Europe" ? null : r, pagina: null })}
            pageHref={(p) => query({ pagina: p > 1 ? String(p) : null })}
          />
        </>
      ) : (
        pa && full ? (
          <PlayerProfile
            data={full}
            heading="h2"
            mode={mode}
            page={page}
            modeHref={modeHref}
            pageHref={(p) => query({ pagina: p > 1 ? String(p) : null })}
            links={
              <>
                {" · "}
                <Link href={query({ vista: "comparar", region: null, pagina: null })} className="text-brass underline">
                  {t.solo.compare}
                </Link>
                {" · "}
                <Link href={query({ a: null, pagina: null })} scroll={false} className="text-brass underline">
                  {t.solo.change}
                </Link>
              </>
            }
            afterHeader={
              <Standing players={[{ slot: "a", p: pa }]} ranks={ranks ?? []} dist={dist} both={false} />
            }
          />
        ) : (
          <>
            <div className="mt-10 max-w-[40rem]">
              <PlayerSlot {...slotProps("a", t.searchPlayer)} />
            </div>
            <p className="mt-10 max-w-[64ch] text-ivory-dim">{t.soloEmpty}</p>
          </>
        )
      )}
    </>
  );
}

/* ---------- Clasificación regional ---------- */

async function Leaderboard({
  region,
  entries,
  heroes,
  ranks,
  dist,
  player,
  page: requested,
  regionHref,
  pageHref,
}: {
  region: Region;
  entries: LeaderboardEntry[] | null;
  heroes: Hero[];
  ranks: Rank[];
  dist: RankBin[] | null;
  player: Player | null;
  page: number;
  regionHref: (r: Region) => string;
  pageHref: (p: number) => string;
}) {
  const m = await getT();
  const t = m.tracker;
  const l = t.lb;
  const { num } = await getFormat();
  const regions = m.common.regions;
  const byId = new Map(heroes.map((h) => [h.id, h]));
  const spot = player?.spot ?? null;
  const here = spot?.region === region ? spot.rank : null;
  const all = entries ?? [];
  const pages = Math.max(1, Math.ceil(all.length / LB_PER_PAGE));
  const page = Math.min(pages, requested);
  const rows = all.slice((page - 1) * LB_PER_PAGE, page * LB_PER_PAGE);
  // Si el jugador está en esta región, en qué página le toca (las entradas van por puesto).
  const herePage = here ? Math.floor(all.findIndex((e) => e.rank === here) / LB_PER_PAGE) + 1 : 0;
  const marks = player?.rank ? [{ slot: "a" as const, name: nameOf(player), badge: player.rank.badge }] : [];

  return (
    <>
      {dist && ranks.length > 0 && (
        <>
          <h2 className="section-title mt-14">{l.distTitle}</h2>
          <p className="mt-2 text-sm text-ivory-dim">{l.distHint}</p>
          <div className="panel mt-5 px-4 pb-4 pt-5 sm:px-8">
            <RankLadder bins={dist} ranks={ranks} marks={marks} />
          </div>
        </>
      )}

      <h2 className="section-title mt-14">{l.topTitle}</h2>
      <nav aria-label={l.regionAria} className="mt-5 flex flex-wrap gap-2">
        {(Object.keys(REGIONS) as Region[]).map((r) => {
          const on = r === region;
          return (
            <Link
              key={r}
              href={regionHref(r)}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`border px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] no-underline transition-colors ${
                on
                  ? "border-brass bg-brass text-ox-deep"
                  : "border-brass-dim text-ivory-dim hover:border-brass hover:text-ivory"
              }`}
            >
              {regions[r]}
            </Link>
          );
        })}
      </nav>

      {player && (
        <p className="mt-5 max-w-[64ch]">
          {spot ? (
            here ? (
              <>
                <strong className="text-pa">{nameOf(player)}</strong>
                {l.atRank}
                {num(here)}
                {l.of}
                {regions[region]}
                {herePage === page ? (
                  l.highlighted
                ) : (
                  <>
                    {" "}
                    (
                    <Link href={pageHref(herePage)} scroll={false} className="text-brass underline">
                      {l.goToPage}
                    </Link>
                    ).
                  </>
                )}
              </>
            ) : (
              <>
                <strong className="text-pa">{nameOf(player)}</strong>
                {l.atRank}
                {num(spot.rank)}
                {l.of}
                <Link href={regionHref(spot.region)} scroll={false} className="text-brass underline">
                  {regions[spot.region]}
                </Link>
                .
              </>
            )
          ) : (
            <>
              <strong className="text-pa">{nameOf(player)}</strong>
              {l.notListed}
            </>
          )}
        </p>
      )}

      {entries === null ? (
        <p className="mt-6 border border-dashed border-brass-dim px-5 py-6 text-ivory-dim">{m.players.search.apiDown}</p>
      ) : entries.length === 0 ? (
        <p className="mt-6 text-ivory-dim">{l.empty}</p>
      ) : (
        <>
          <ol className="panel mt-5">
            {rows.map((e) => {
              const me = here === e.rank;
              return (
                <li
                  key={e.rank}
                  className={`border-b border-brass/15 last:border-b-0 ${me ? "bg-pa/15" : ""}`}
                  aria-current={me ? "true" : undefined}
                >
                  <Link
                    href={`/tracker/ir?region=${region}&puesto=${e.rank}&lang=${m.lang}`}
                    prefetch={false}
                    className="group flex items-center gap-3 px-3 py-3 no-underline transition-colors hover:bg-wine/60 sm:gap-5 sm:px-6"
                    aria-label={l.viewAria(e.name, e.rank)}
                  >
                    <span
                      className={`w-10 shrink-0 text-right text-lg font-semibold tabular-nums ${e.rank <= 3 ? "text-brass" : "text-ivory-dim"}`}
                    >
                      {num(e.rank)}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {me && <Mark slot="a" />}
                      <span className={`truncate group-hover:text-brass ${me ? "font-bold" : "font-semibold"}`}>
                        {e.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {e.heroIds.slice(0, 3).map((id) => (
                        <HeroIcon key={id} hero={byId.get(id)} size={32} />
                      ))}
                    </span>
                    <span aria-hidden="true" className="hidden text-brass transition-transform group-hover:translate-x-1 sm:block">
                      <svg width="18" height="10" viewBox="0 0 22 12">
                        <path d="M0 6h20M15 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <nav aria-label={l.pagerAria} className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ivory-dim">
              {l.range(num(rows[0].rank), num(rows[rows.length - 1].rank), num(all.length))}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <PagerLink href={page > 1 ? pageHref(1) : null}>{m.players.profile.first}</PagerLink>
              <PagerLink href={page > 1 ? pageHref(page - 1) : null} rel="prev">
                {m.players.profile.prev}
              </PagerLink>
              <span className="px-2 text-sm text-ivory">
                {num(page)} / {num(pages)}
              </span>
              <PagerLink href={page < pages ? pageHref(page + 1) : null} rel="next">
                {m.players.profile.next}
              </PagerLink>
              <PagerLink href={page < pages ? pageHref(pages) : null}>{m.players.profile.last}</PagerLink>
            </div>
          </nav>
          <p className="mt-3 text-xs text-ivory-dim">
            {l.footnote(regions[region])}
          </p>
        </>
      )}
    </>
  );
}

const LB_PER_PAGE = 10;

function PagerLink({ href, rel, children }: { href: string | null; rel?: string; children: React.ReactNode }) {
  const base = "border px-3 py-1.5 text-sm font-semibold uppercase tracking-[0.12em] no-underline transition-colors";
  return href ? (
    <Link
      href={href}
      scroll={false}
      rel={rel}
      className={`${base} border-brass-dim text-ivory hover:border-brass hover:text-brass`}
    >
      {children}
    </Link>
  ) : (
    <span className={`${base} border-brass-dim/40 text-ivory-dim/50`}>{children}</span>
  );
}


/* ---------- Huecos de jugador ---------- */

async function Mark({ slot }: { slot: Slot }) {
  const t = (await getT()).tracker.slot;
  return (
    <span
      className={`inline-grid size-6 shrink-0 place-items-center align-middle font-sans text-sm font-bold text-ox-deep ${SLOT[slot].bg}`}
      aria-label={slot === "a" ? t.p1 : t.p2}
    >
      {SLOT[slot].n}
    </span>
  );
}

async function PlayerSlot({
  slot,
  player,
  missing,
  ranks,
  clearHref,
  others,
  exclude,
  alone,
  label: custom,
}: {
  slot: Slot;
  player: Player | null;
  missing: boolean;
  ranks: Rank[];
  clearHref: string;
  others: Record<string, string>;
  exclude: number[];
  /** Ningún hueco está ocupado: el de la izquierda hace de buscador principal. */
  alone: boolean;
  label?: string;
}) {
  const m = await getT();
  const t = m.tracker;
  const label = custom ?? (slot === "a" ? t.slot.p1 : alone ? t.slot.p2compare : t.slot.p2);
  if (!player) {
    return (
      <div>
        <ComparePicker slot={slot} label={label} others={others} />
        {missing && (
          <p className="mt-3 text-sm text-loss">{t.notFound}</p>
        )}
        <RecentPlayers slot={slot} others={others} exclude={exclude} />
      </div>
    );
  }
  const rankImg = player.rank && ranks.length ? rankImage(ranks, player.rank.tier, player.rank.subrank) : null;

  return (
    <section
      aria-label={label}
      className="deco-frame flex items-center gap-4 bg-[linear-gradient(180deg,var(--wine-raised),var(--ox))] px-5 py-6"
    >
      {player.profile && (
        <Image
          src={player.profile.avatarFull}
          alt=""
          width={72}
          height={72}
          className="size-[72px] shrink-0 border border-brass"
        />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2.5 font-display text-2xl tracking-[0.08em] text-brass">
          <Mark slot={slot} />
          <span className="truncate">{nameOf(player)}</span>
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ivory-dim">
          {rankImg && <Image src={rankImg} alt="" width={24} height={24} className="size-6" />}
          <span>{rankNameOf(ranks, player.rank, m.players.profile.unranked)}</span>
        </p>
        <p className="mt-2 flex gap-4 text-sm">
          <Link href={`/jugadores/${player.accountId}`} className="text-brass underline">
            {t.fullProfile}
          </Link>
          <Link href={clearHref} scroll={false} className="text-brass underline">
            {t.change}
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ---------- Clasificación ---------- */

type Entry = { slot: Slot; p: Player };

type Cell = { text: string; bar?: number };
type DuelRowData = { key: string; label: string; a: Cell; b: Cell; lead: Slot | null; delta?: string };

async function Standing({
  players,
  ranks,
  dist,
  both,
}: {
  players: Entry[];
  ranks: Rank[];
  dist: RankBin[] | null;
  both: boolean;
}) {
  const m = await getT();
  const t = m.tracker;
  const s8 = t.standing;
  const { num, pct } = await getFormat();
  const regions = m.common.regions;
  const unranked = m.players.profile.unranked;
  const rankName = (rs: Rank[], r: PlayerRank | null) => rankNameOf(rs, r, unranked);
  const ranked = players.filter((e) => e.p.rank);
  const marks = ranked.map((e) => ({ slot: e.slot, name: nameOf(e.p), badge: e.p.rank!.badge }));
  const stand = (e: Entry) => (dist && e.p.rank ? standing(dist, e.p.rank.badge) : null);

  const spotText = (p: Player) =>
    p.spot ? s8.spotText(num(p.spot.rank), regions[p.spot.region]) : s8.outside;

  const spotShort = (p: Player) => (p.spot ? s8.spotShort(num(p.spot.rank), regions[p.spot.region]) : s8.noSpot);

  // Veredicto en una frase, solo con dos jugadores clasificados.
  let verdict: React.ReactNode = null;
  if (both && ranked.length === 2) {
    const [x, y] = ranked;
    const sx = rankStep(x.p.rank!.tier, x.p.rank!.subrank);
    const sy = rankStep(y.p.rank!.tier, y.p.rank!.subrank);
    const hi = sx >= sy ? x : y;
    const lo = hi === x ? y : x;
    const steps = Math.abs(sx - sy);
    const between = dist ? Math.abs((stand(x)?.share ?? 0) - (stand(y)?.share ?? 0)) : null;
    verdict =
      steps === 0 ? (
        <>{s8.sameRank(rankName(ranks, x.p.rank))}</>
      ) : (
        <>
          <strong className={SLOT[hi.slot].text}>{nameOf(hi.p)}</strong>
          {s8.ahead(steps)}
          <strong className={SLOT[lo.slot].text}>{nameOf(lo.p)}</strong>
          {between !== null && s8.between(pct(between, 0))}.
        </>
      );
  }

  const rows: DuelRowData[] = [];
  if (both && players.length === 2) {
    const [x, y] = players;
    const stepOf = (e: Entry) => (e.p.rank ? rankStep(e.p.rank.tier, e.p.rank.subrank) : 0);
    const sa = stepOf(x);
    const sb = stepOf(y);
    rows.push({
      key: "rank",
      label: s8.rank,
      a: { text: rankName(ranks, x.p.rank), bar: sa / 66 },
      b: { text: rankName(ranks, y.p.rank), bar: sb / 66 },
      lead: sa === sb ? null : sa > sb ? "a" : "b",
    });
    if (dist) {
      const pa = stand(x)?.share ?? 0;
      const pb = stand(y)?.share ?? 0;
      rows.push({
        key: "pct",
        label: s8.above,
        a: { text: x.p.rank ? pct(pa, 0) : "—", bar: pa },
        b: { text: y.p.rank ? pct(pb, 0) : "—", bar: pb },
        lead: !x.p.rank || !y.p.rank || Math.abs(pa - pb) < 0.005 ? null : pa > pb ? "a" : "b",
      });
    }
    const ra = x.p.spot?.rank;
    const rb = y.p.spot?.rank;
    rows.push({
      key: "spot",
      label: s8.regional,
      a: { text: spotShort(x.p) },
      b: { text: spotShort(y.p) },
      lead: ra && rb ? (ra < rb ? "a" : rb < ra ? "b" : null) : ra ? "a" : rb ? "b" : null,
    });
  }

  return (
    <section aria-labelledby="clasificacion">
      <h2 id="clasificacion" className="section-title mt-12">
        {s8.title}
      </h2>

      {both ? (
        <>
          {verdict && <p className="mt-3 max-w-[64ch]">{verdict}</p>}
          {rows.length > 0 && (
            <dl className="panel mt-5 px-4 py-2 sm:px-8">
              {rows.map((r) => (
                <DuelRow key={r.key} row={r} names={{ a: nameOf(players[0].p), b: nameOf(players[1].p) }} />
              ))}
            </dl>
          )}
        </>
      ) : (
        <dl className="panel mt-5 grid gap-x-8 gap-y-4 p-5 sm:grid-cols-3">
          {players.map((e) => {
            const s = stand(e);
            return (
              <div key={e.p.accountId} className="contents">
                <SoloFact label={s8.rank} value={rankName(ranks, e.p.rank)} />
                <SoloFact
                  label={s8.above}
                  value={s && e.p.rank ? pct(s.share, 0) : "—"}
                  note={s && e.p.rank ? s8.aboveNote : undefined}
                />
                <SoloFact label={s8.regional} value={spotText(e.p)} note={s8.byIdName} />
              </div>
            );
          })}
        </dl>
      )}

      {dist && ranks.length > 0 ? (
        marks.length > 0 ? (
          <div className="panel mt-5 px-4 pb-4 pt-5 sm:px-8">
            <RankLadder bins={dist} ranks={ranks} marks={marks} />
          </div>
        ) : (
          <p className="mt-5 text-ivory-dim">
            {players.length > 1 ? s8.neither : s8.single}
            {s8.noRankedMatches}
          </p>
        )
      ) : (
        <p className="mt-5 text-ivory-dim">{s8.distError}</p>
      )}
    </section>
  );
}

function SoloFact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-t border-brass/25 pt-2">
      <dt className="text-xs uppercase tracking-[0.12em] text-ivory-dim">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
      {note && <p className="text-xs text-ivory-dim">{note}</p>}
    </div>
  );
}

/* ---------- Fila de comparación ---------- */

async function DuelRow({ row, names }: { row: DuelRowData; names: Record<Slot, string> }) {
  const s8 = (await getT()).tracker.standing;
  const cell = (slot: Slot) => {
    const c = row[slot];
    const wins = row.lead === slot;
    const dim = row.lead !== null && !wins;
    const s = SLOT[slot];
    const isA = slot === "a";
    return (
      <div className={isA ? "order-2 sm:order-1" : "order-3"}>
        <dd
          className={`flex items-baseline gap-2 ${isA ? "sm:flex-row-reverse" : "justify-end sm:justify-start"}`}
          aria-label={`${names[slot]}: ${c.text}${wins ? s8.best : ""}`}
        >
          <span className={`text-2xl tabular-nums ${wins ? "font-bold text-ivory" : dim ? "font-semibold text-ivory-dim" : "font-semibold"}`}>
            {c.text}
          </span>
          {wins && row.delta && <span className={`text-sm font-bold ${s.text}`}>{row.delta}</span>}
        </dd>
        {c.bar !== undefined && (
          <div
            className={`mt-1.5 flex h-1.5 bg-ox-deep ${isA ? "justify-start sm:justify-end" : "justify-end sm:justify-start"}`}
            aria-hidden="true"
          >
            <span
              className={`h-full ${s.bg} ${dim ? "opacity-45" : ""}`}
              style={{ width: `${Math.max(2, Math.min(1, c.bar) * 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 items-start gap-x-6 gap-y-1 border-b border-brass/15 py-4 last:border-b-0 sm:grid-cols-[1fr_11rem_1fr]">
      <dt className="order-1 col-span-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-ivory-dim sm:order-2 sm:col-span-1 sm:pt-2">
        {row.label}
      </dt>
      {cell("a")}
      {cell("b")}
    </div>
  );
}

/* ---------- Frente a frente ---------- */

type Metric = {
  key: string;
  label: string;
  group: string;
  pick: (s: Summary) => number;
  fmt: (v: number) => string;
  /** "none" cuando mayor no significa mejor (partidas, duración): no se marca ganador. */
  rule?: "high" | "low" | "none";
  /** La diferencia se da en puntos porcentuales en vez de en tanto por ciento. */
  points?: boolean;
};

function buildMetrics(t: Messages["tracker"], f: Format): Metric[] {
  const { num, pct, souls, duration } = f;
  const x = t.metrics;
  return [
    { key: "n", label: x.n, group: x.groups.result, pick: (s) => s.n, fmt: (v) => num(v), rule: "none" },
    { key: "wr", label: x.wr, group: x.groups.result, pick: (s) => s.winRate, fmt: (v) => pct(v, 1), points: true },
    { key: "kda", label: x.kda, group: x.groups.result, pick: (s) => s.kda, fmt: (v) => num(v, 2) },
    { key: "k", label: x.k, group: x.groups.combat, pick: (s) => s.killsAvg, fmt: (v) => num(v, 1) },
    { key: "d", label: x.d, group: x.groups.combat, pick: (s) => s.deathsAvg, fmt: (v) => num(v, 1), rule: "low" },
    { key: "a", label: x.a, group: x.groups.combat, pick: (s) => s.assistsAvg, fmt: (v) => num(v, 1) },
    { key: "spm", label: x.spm, group: x.groups.economy, pick: (s) => s.soulsPerMin, fmt: (v) => num(v) },
    { key: "sa", label: x.sa, group: x.groups.economy, pick: (s) => s.soulsAvg, fmt: (v) => souls(v) },
    { key: "lh", label: x.lh, group: x.groups.economy, pick: (s) => s.lastHitsPerMin, fmt: (v) => num(v, 1) },
    { key: "dur", label: x.dur, group: x.groups.pace, pick: (s) => s.durationAvg, fmt: (v) => duration(Math.round(v)), rule: "none" },
  ];
}

/** Ventaja del que gana, en el idioma de la métrica: «+12 %», «−18 %» (menos muertes) o «+3,2 pp». */
function deltaText(m: Metric, va: number, vb: number, f: Format, t: Messages["tracker"]): string | undefined {
  const { num } = f;
  const pctSign = t.metrics.pct;
  const rule = m.rule ?? "high";
  const hi = Math.max(va, vb);
  const lo = Math.min(va, vb);
  if (rule === "none" || hi - lo < 1e-9) return undefined;
  // Una ventaja que redondea a cero es ruido: se omite en vez de escribir «+0 %».
  if (m.points) return (hi - lo) * 100 >= 0.05 ? `+${num((hi - lo) * 100, 1)} ${t.metrics.pp}` : undefined;
  if (rule === "low") return ((hi - lo) / hi) * 100 >= 0.5 ? `−${num(((hi - lo) / hi) * 100, 0)}${pctSign}` : undefined;
  return lo > 0 && ((hi - lo) / lo) * 100 >= 0.5 ? `+${num(((hi - lo) / lo) * 100, 0)}${pctSign}` : undefined;
}

function metricRow(m: Metric, a: Summary, b: Summary, f: Format, t: Messages["tracker"]): DuelRowData & { group: string } {
  const va = m.pick(a);
  const vb = m.pick(b);
  const rule = m.rule ?? "high";
  const tie = Math.abs(va - vb) < 1e-9;
  const lead: Slot | null = rule === "none" || tie ? null : (rule === "high" ? va > vb : va < vb) ? "a" : "b";
  const max = Math.max(va, vb, 1e-9);
  return {
    key: m.key,
    group: m.group,
    label: m.label,
    a: { text: m.fmt(va), bar: va / max },
    b: { text: m.fmt(vb), bar: vb / max },
    lead,
    delta: deltaText(m, va, vb, f, t),
  };
}

async function ModeNav({ mode, hrefFor }: { mode: Mode; hrefFor: (m: Mode) => string }) {
  const t = (await getT()).tracker;
  return (
    <nav aria-label={t.modeAria} className="mt-5 grid max-w-xl grid-cols-3 border border-brass-dim">
      {MODE_IDS.map((mid) => {
        const on = mid === mode;
        return (
          <Link
            key={mid}
            href={hrefFor(mid)}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-[0.14em] no-underline transition-colors ${
              on ? "bg-brass text-ox-deep" : "text-ivory-dim hover:bg-wine hover:text-ivory"
            }`}
          >
            {t.modes[mid]}
          </Link>
        );
      })}
    </nav>
  );
}

async function Duel({
  a,
  b,
  matchesA,
  matchesB,
  mode,
  heroes,
  hrefFor,
}: {
  a: Player;
  b: Player;
  matchesA: MatchRow[];
  matchesB: MatchRow[];
  mode: Mode;
  heroes: Hero[];
  hrefFor: (m: Mode) => string;
}) {
  const m = await getT();
  const t = m.tracker;
  const d = t.duel;
  const f = await getFormat();
  const { num } = f;
  const METRICS = buildMetrics(t, f);
  const sa = summarize(matchesA);
  const sb = summarize(matchesB);
  const names = { a: nameOf(a), b: nameOf(b) };
  const byId = new Map(heroes.map((h) => [h.id, h]));

  const empty = sa.n === 0 || sb.n === 0;
  const rows = empty ? [] : METRICS.map((mt) => metricRow(mt, sa, sb, f, t));
  const wins = { a: rows.filter((r) => r.lead === "a").length, b: rows.filter((r) => r.lead === "b").length };
  const decided = rows.filter((r) => METRICS.find((mt) => mt.key === r.key)?.rule !== "none").length;
  const ties = decided - wins.a - wins.b;
  const groups = [...new Set(rows.map((r) => r.group))];

  // Héroes que juegan los dos, de más a menos partidas conjuntas.
  const group = (ms: MatchRow[]) => {
    const g = new Map<number, MatchRow[]>();
    for (const mt of ms) g.set(mt.heroId, [...(g.get(mt.heroId) ?? []), mt]);
    return g;
  };
  const ga = group(matchesA);
  const gb = group(matchesB);
  const shared = [...ga.keys()]
    .filter((id) => gb.has(id))
    .map((id) => ({ id, a: summarize(ga.get(id)!), b: summarize(gb.get(id)!) }))
    .sort((x, y) => y.a.n + y.b.n - (x.a.n + x.b.n))
    .slice(0, 8);

  return (
    <>
      <h2 className="section-title mt-14">{d.title}</h2>
      <ModeNav mode={mode} hrefFor={hrefFor} />

      {empty ? (
        <p className="mt-8 max-w-[64ch] text-ivory-dim">
          {sa.n === 0 && sb.n === 0 ? d.emptyBoth : d.emptyOne(sa.n === 0 ? names.a : names.b)}
        </p>
      ) : (
        <>
          <div className="mt-8">
            <p className="max-w-[64ch]">
              {wins.a === wins.b ? (
                <>{d.tied(wins.a)}</>
              ) : (
                <>
                  <strong className={SLOT[wins.a > wins.b ? "a" : "b"].text}>
                    {names[wins.a > wins.b ? "a" : "b"]}
                  </strong>
                  {d.winsIn(Math.max(wins.a, wins.b), decided)}
                  {ties > 0 && d.ties(ties)}.
                </>
              )}
            </p>
            <div
              className="mt-3 flex h-2 max-w-xl gap-px bg-ox-deep"
              role="img"
              aria-label={d.scoreAria(names.a, wins.a, names.b, wins.b, ties)}
            >
              <span className="bg-pa" style={{ flex: wins.a }} />
              <span className="bg-brass-dim" style={{ flex: ties }} />
              <span className="bg-pb" style={{ flex: wins.b }} />
            </div>
            <p className="mt-2 text-sm text-ivory-dim">
              {d.sample(num(sa.n), names.a, num(sb.n), names.b)}
              {Math.min(sa.n, sb.n) < 15 && <span className="text-ivory">{d.few}</span>}
            </p>
          </div>

          <div className="panel mt-5 px-4 py-2 sm:px-8">
            {groups.map((g) => (
              <section key={g} aria-label={g} className="border-b border-brass/25 py-2 last:border-b-0">
                <h3 className="pt-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-brass">
                  {g}
                </h3>
                <dl>
                  {rows
                    .filter((r) => r.group === g)
                    .map((r) => (
                      <DuelRow key={r.key} row={r} names={names} />
                    ))}
                </dl>
              </section>
            ))}
          </div>

          <h2 className="section-title mt-14">{d.formTitle}</h2>
          <p className="mt-2 text-sm text-ivory-dim">{d.formHint(d.formModes[mode])}</p>
          <div className="panel mt-5 grid gap-x-10 gap-y-6 px-4 py-5 sm:px-8 md:grid-cols-2">
            <Form slot="a" player={a} matches={matchesA} byId={byId} />
            <Form slot="b" player={b} matches={matchesB} byId={byId} />
          </div>
        </>
      )}

      <Direct a={a} b={b} />

      {!empty &&
        (shared.length > 0 ? (
          <>
            <h2 className="section-title mt-14">{d.commonTitle}</h2>
            <p className="mt-2 text-sm text-ivory-dim">{d.commonHint}</p>
            <ul className="panel mt-5">
              {shared.map((h) => (
                <li
                  key={h.id}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-brass/15 px-3 py-3 last:border-b-0 sm:gap-6 sm:px-6"
                >
                  <HeroLine slot="a" s={h.a} other={h.b} />
                  <div className="flex flex-col items-center gap-1 text-center">
                    <HeroIcon hero={byId.get(h.id)} size={48} />
                    <span className="max-w-[7rem] truncate text-xs font-semibold uppercase tracking-[0.1em] text-ivory-dim">
                      {byId.get(h.id)?.name ?? h.id}
                    </span>
                  </div>
                  <HeroLine slot="b" s={h.b} other={h.a} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-14 text-ivory-dim">{d.noCommon}</p>
        ))}
    </>
  );
}

async function HeroLine({ slot, s, other }: { slot: Slot; s: Summary; other: Summary }) {
  const d = (await getT()).tracker.duel;
  const { num, pct } = await getFormat();
  const lead = s.winRate > other.winRate;
  return (
    <div className={slot === "a" ? "text-right" : "text-left"}>
      <p className={`text-lg font-semibold ${lead ? SLOT[slot].text : "text-ivory"}`}>{pct(s.winRate, 0)}</p>
      <p className="text-sm text-ivory-dim">
        {d.kdaMatches(num(s.kda, 2), num(s.n), s.n === 1)}
      </p>
    </div>
  );
}

/* ---------- Forma reciente ---------- */

async function Form({
  slot,
  player,
  matches,
  byId,
}: {
  slot: Slot;
  player: Player;
  matches: MatchRow[];
  byId: Map<number, Hero>;
}) {
  const m = await getT();
  const d = m.tracker.duel;
  const f = recentForm(matches);
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 font-semibold">
        <Mark slot={slot} />
        <span className="truncate">{nameOf(player)}</span>
      </p>
      <p className="mt-1 text-sm text-ivory-dim">
        <span className="text-win">{f.wins}{m.players.profile.winsShort}</span> /{" "}
        <span className="text-loss">{f.losses}{m.players.profile.lossesShort}</span>
        {f.streak >= 2 && (f.streakWon ? d.streakWin(f.streak) : d.streakLoss(f.streak))}
      </p>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {f.last.map((mt) => {
          const hero = byId.get(mt.heroId);
          const score = `${mt.kills}/${mt.deaths}/${mt.assists}`;
          return (
            <li key={mt.matchId}>
              <Link
                href={`/partidas/${mt.matchId}?jugador=${player.accountId}`}
                className={`block border-b-[3px] no-underline ${mt.won ? "border-win" : "border-loss"}`}
                aria-label={d.formAria(hero?.name ?? d.heroFallback, mt.won, score)}
                title={d.formTitle2(hero?.name ?? String(mt.heroId), mt.won, score)}
              >
                <HeroIcon hero={hero} size={40} />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- Cara a cara directo ---------- */

async function Direct({ a, b }: { a: Player; b: Player }) {
  const m = await getT();
  const dr = m.tracker.direct;
  const { dateTime, duration, num, pct } = await getFormat();
  const h = headToHead(a.history, b.history);
  const names = { a: nameOf(a), b: nameOf(b) };

  return (
    <>
      <h2 className="section-title mt-14">{dr.title}</h2>
      {h.shared.length === 0 ? (
        <p className="mt-4 max-w-[64ch] text-ivory-dim">{dr.none}</p>
      ) : (
        <>
          <p className="mt-2 max-w-[64ch] text-sm text-ivory-dim">{dr.hint}</p>
          <div className="panel mt-5 grid gap-x-10 gap-y-6 px-4 py-5 sm:px-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">{dr.rivals}</p>
              {h.rivals.length === 0 ? (
                <p className="mt-1 text-ivory-dim">{dr.neverFaced}</p>
              ) : (
                <>
                  <p className="mt-1">
                    {dr.rivalsPre(num(h.rivals.length), h.rivals.length === 1)}
                    <strong className="text-pa">{names.a}</strong>
                    {dr.rivalsWon(num(h.aWins))}
                    <strong className="text-pb">{names.b}</strong> {num(h.bWins)}.
                  </p>
                  <div
                    className="mt-2 flex h-2 gap-px bg-ox-deep"
                    role="img"
                    aria-label={dr.rivalsAria(names.a, h.aWins, names.b, h.bWins)}
                  >
                    <span className="bg-pa" style={{ flex: h.aWins }} />
                    <span className="bg-pb" style={{ flex: h.bWins }} />
                  </div>
                </>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">{dr.allies}</p>
              {h.allies.length === 0 ? (
                <p className="mt-1 text-ivory-dim">{dr.neverTeam}</p>
              ) : (
                <p className="mt-1">
                  {dr.alliesPre(num(h.allies.length), h.allies.length === 1, num(h.alliesWon), h.alliesWon === 1)}
                  <span className={h.alliesWon / h.allies.length >= 0.5 ? "text-win" : "text-loss"}>
                    {pct(h.alliesWon / h.allies.length, 0)}
                  </span>
                  ).
                </p>
              )}
            </div>
          </div>

          <ul className="panel mt-3">
            {h.shared.slice(0, 6).map((s) => (
              <li key={s.a.matchId} className="border-b border-brass/15 last:border-b-0">
                <Link
                  href={`/partidas/${s.a.matchId}?jugador=${a.accountId}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 no-underline transition-colors hover:bg-wine/50 sm:px-6"
                >
                  <span className="w-28 text-sm text-ivory-dim">{dateTime(s.a.start)}</span>
                  <span className="flex items-center gap-2">
                    <Mark slot="a" />
                    <span className={s.a.won ? "text-win" : "text-loss"}>{s.a.won ? m.players.profile.winsShort : m.players.profile.lossesShort}</span>
                  </span>
                  <span className="text-sm text-ivory-dim">{s.rivals ? dr.against : dr.with}</span>
                  <span className="flex items-center gap-2">
                    <Mark slot="b" />
                    <span className={s.b.won ? "text-win" : "text-loss"}>{s.b.won ? m.players.profile.winsShort : m.players.profile.lossesShort}</span>
                  </span>
                  <span className="ml-auto text-sm text-ivory-dim">{duration(s.a.duration)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {h.shared.length > 6 && (
            <p className="mt-2 text-xs text-ivory-dim">{dr.lastSix(num(h.shared.length))}</p>
          )}
        </>
      )}
    </>
  );
}
