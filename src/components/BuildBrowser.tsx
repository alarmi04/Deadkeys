"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useEffect, useRef, useState } from "react";
import { CopyCode } from "@/components/CopyCode";
import { Dial } from "@/components/Dial";
import { FilterLink } from "@/components/BuildFilters";
import type { BuildDetail, BuildItemStat, BuildStat } from "@/lib/api";
import { useFormat, useT } from "@/i18n/client";

export type BrowserHero = { id: number; name: string; small: string };
export type BrowserItem = {
  name: string;
  image: string;
  slot: string | null;
  tier: number | null;
  upgrade: boolean;
  cost: number | null;
  quip: string | null;
  inShop: boolean;
};
export type BrowserBadge = { image: string; label: string };
export type BrowserRow = {
  stat: BuildStat;
  detail: BuildDetail | null;
  author: string | null;
  badge?: BrowserBadge | null;
};

const ROMAN = ["", "I", "II", "III", "IV", "V"];
const SLOT_VAR: Record<string, string> = {
  weapon: "var(--slot-weapon)",
  vitality: "var(--slot-vitality)",
  spirit: "var(--slot-spirit)",
};

/** Caché en memoria de "más comprados" por build y rango: volver a una build es instantáneo. */
const boughtCache = new Map<string, BuildItemStat[] | "error">();

export function BuildBrowser({
  rows,
  initialId,
  heroes,
  items,
  tier,
  rankName,
  moreHref,
  moreCount,
}: {
  rows: BrowserRow[];
  initialId: number | null;
  heroes: Record<number, BrowserHero>;
  items: Record<number, BrowserItem>;
  tier: number | null;
  rankName: string | null;
  moreHref: string | null;
  moreCount: number;
}) {
  const t = useT().builds.browser;
  // Varias builds pueden estar abiertas a la vez: comparar es el objetivo de la tabla.
  const [open, setOpen] = useState<Set<number>>(() => new Set(initialId === null ? [] : [initialId]));

  function toggle(id: number) {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
    const url = new URL(window.location.href);
    if (next.size === 1) url.searchParams.set("build", String([...next][0]));
    else url.searchParams.delete("build");
    window.history.replaceState(null, "", url);
  }

  return (
    <section aria-label={t.aria} className="mt-6">
      <div
        aria-hidden="true"
        className="hidden items-end gap-4 border-b border-brass px-4 pb-2 text-xs font-bold tracking-[0.12em] text-brass uppercase md:grid md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_minmax(0,17rem)_1.25rem]"
      >
        <span>{t.build}</span>
        <span className="text-right">{t.wins}</span>
        <span className="text-right">{t.matches}</span>
        <span>{t.keyItems}</span>
        <span />
      </div>
      <ol className="md:border-x md:border-b md:border-brass-dim">
        {rows.map((r) => (
          <BuildRow
            key={r.stat.buildId}
            row={r}
            hero={heroes[r.stat.heroId]}
            items={items}
            tier={tier}
            rankName={rankName}
            expanded={open.has(r.stat.buildId)}
            onToggle={toggle}
          />
        ))}
      </ol>
      {moreHref && (
        <FilterLink
          href={moreHref}
          className="mt-4 block border border-brass-dim px-4 py-3.5 text-center text-sm font-semibold uppercase tracking-[0.14em] text-brass no-underline transition-colors hover:bg-wine/50 hover:text-ivory"
        >
          {t.showMore(moreCount)}
        </FilterLink>
      )}
    </section>
  );
}

/** Los objetos de mayor nivel de la build (sin repetir): resumen para comparar de un vistazo. */
function keyItems(detail: BuildDetail | null, items: Record<number, BrowserItem>): number[] {
  if (!detail) return [];
  const seen = new Set<number>();
  const list: number[] = [];
  for (const s of detail.sections) {
    for (const it of s.items) {
      if (seen.has(it.itemId) || !items[it.itemId]?.image) continue;
      seen.add(it.itemId);
      list.push(it.itemId);
    }
  }
  return list
    .sort((x, y) => (items[y].tier ?? 0) - (items[x].tier ?? 0) || (items[y].cost ?? 0) - (items[x].cost ?? 0))
    .slice(0, 6);
}

function BuildRow({
  row,
  hero,
  items,
  tier,
  rankName,
  expanded,
  onToggle,
}: {
  row: BrowserRow;
  hero: BrowserHero | undefined;
  items: Record<number, BrowserItem>;
  tier: number | null;
  rankName: string | null;
  expanded: boolean;
  onToggle: (id: number) => void;
}) {
  const t = useT().builds.browser;
  const { pct, compact } = useFormat();
  const { stat, detail, author, badge } = row;
  const panelId = `build-${stat.buildId}`;
  const key = keyItems(detail, items);
  return (
    <li className="border-b border-brass-dim/40 last:border-b-0 max-md:mb-3 max-md:border max-md:border-brass-dim">
      <h3 className="contents">
        <button
          type="button"
          onClick={() => onToggle(stat.buildId)}
          aria-expanded={expanded}
          aria-controls={expanded ? panelId : undefined}
          className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_minmax(0,17rem)_1.25rem] ${
            expanded ? "bg-wine-raised" : "hover:bg-wine/50"
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <HeroThumb hero={hero} size={44} />
            <span className="min-w-0">
              <span
                className={`block truncate font-semibold ${expanded ? "text-brass" : "text-ivory group-hover:text-brass"}`}
              >
                {detail?.name || t.buildN(stat.buildId)}
              </span>
              <span className="flex items-center gap-1.5 text-sm leading-none text-ivory-dim">
                <span className="shrink-0">{hero?.name ?? "—"}</span>
                {author && (
                  <>
                    <span aria-hidden="true">·</span>
                    {badge && (
                      <Image
                        src={badge.image}
                        alt={badge.label}
                        title={badge.label}
                        width={24}
                        height={24}
                        className="size-6 shrink-0 object-contain"
                      />
                    )}
                    <span className="truncate">{author}</span>
                  </>
                )}
              </span>
            </span>
          </span>
          <span
            className={`text-right text-lg font-semibold tabular-nums ${stat.winRate >= 0.5 ? "text-win" : "text-loss"}`}
          >
            {pct(stat.winRate)}
          </span>
          <span className="text-right text-sm text-ivory-dim tabular-nums max-md:order-last max-md:col-span-2 max-md:text-left">
            {t.matchCount(compact(stat.matches), stat.matches === 1)}
          </span>
          <span className="flex gap-1 max-md:col-span-2" role="img" aria-label={t.keyItems}>
            {key.map((id) => (
              <span
                key={id}
                title={items[id].name}
                className="grid size-9 shrink-0 place-items-center border border-brass-dim/60 bg-ox-deep"
              >
                <Image src={items[id].image} alt="" width={28} height={28} className="size-7 object-contain" />
              </span>
            ))}
          </span>
          <span
            aria-hidden="true"
            className={`text-brass transition-transform duration-200 ease-out max-md:hidden ${expanded ? "rotate-90" : ""}`}
          >
            ›
          </span>
        </button>
      </h3>
      {expanded && <BuildPanel id={panelId} row={row} hero={hero} items={items} tier={tier} rankName={rankName} />}
    </li>
  );
}

function HeroThumb({ hero, size }: { hero: BrowserHero | undefined; size: number }) {
  if (!hero?.small) {
    return <span className="inline-block shrink-0 bg-wine" style={{ width: size, height: size }} aria-hidden="true" />;
  }
  return (
    <Image
      src={hero.small}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-cover object-top"
      style={{ width: size, height: size }}
    />
  );
}

function BuildPanel({
  id,
  row,
  hero,
  items,
  tier,
  rankName,
}: {
  id: string;
  row: BrowserRow;
  hero: BrowserHero | undefined;
  items: Record<number, BrowserItem>;
  tier: number | null;
  rankName: string | null;
}) {
  const t = useT().builds.browser;
  const { pct, num, date } = useFormat();
  const { stat, detail, author, badge } = row;
  const bought = useBought(stat.buildId, tier);
  const byItem = new Map((bought && bought !== "error" ? bought : []).map((s) => [s.itemId, s]));
  return (
    <div id={id} className="border-t border-brass-dim bg-ox-deep">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-brass-dim/40 px-5 py-3 sm:px-6">
        <p className="min-w-0 text-sm text-ivory-dim">
          {hero && (
            <Link href={`/heroes/${hero.id}`} className="text-brass underline">
              {hero.name}
            </Link>
          )}
          {author && (
            <>
              {t.by}
              {badge && (
                <Image
                  src={badge.image}
                  alt=""
                  width={24}
                  height={24}
                  className="mx-0.5 inline-block size-6 -translate-y-px object-contain"
                />
              )}
              {author}
              {badge && ` (${badge.label})`}
            </>
          )}
          {detail && t.version(detail.version, date(detail.updated))}
        </p>
        <CopyCode code={String(stat.buildId)} />
      </div>

      <div className="grid gap-x-8 gap-y-8 px-5 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          {detail ? (
            <div className="flex flex-col gap-4">
              {/* Las secciones fluyen en filas: las cortas (Mid, Late…) se colocan una junto a otra. */}
              <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
                {detail.sections.map((s, i) => (
                  <section key={i} aria-label={s.name || t.section(i + 1)} className="max-w-full min-w-0">
                    <SectionHeading section={s} index={i} minute={sectionMinute(s, byItem)} />
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.items.map((it, j) => (
                        <ItemTile
                          key={`${it.itemId}-${j}`}
                          id={it.itemId}
                          item={items[it.itemId]}
                          note={it.annotation}
                          stat={byItem.get(it.itemId)}
                          matches={stat.matches}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              {detail.description.trim() && (
                <details className="border-t border-brass-dim/40 pt-4">
                  <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.12em] text-brass marker:text-brass-dim">
                    {t.authorNotes}
                  </summary>
                  <p className="mt-3 max-w-[70ch] text-sm break-words whitespace-pre-line text-ivory-dim">
                    {detail.description.trim()}
                  </p>
                </details>
              )}
            </div>
          ) : (
            <p className="border border-dashed border-brass-dim px-5 py-6 text-ivory-dim">
              {t.itemsError}
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-6 xl:border-l xl:border-brass-dim/40 xl:pl-8">
          <div>
            <Dial value={stat.winRate} label={t.dialLabel(pct(stat.winRate))} />
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center xl:grid-cols-1 xl:text-left">
              <Fact label={t.matches} value={num(stat.matches)} />
              <Fact label={t.players} value={num(stat.players)} />
              <Fact label={t.wins} value={num(stat.wins)} />
            </dl>
            <p className="mt-3 text-xs text-ivory-dim">
              {t.period(rankName ? t.rankScope(rankName) : t.allRanks)}
              {stat.matches < 20 && t.fewMatches}
            </p>
          </div>
          <MostBought data={bought} matches={stat.matches} items={items} />
        </aside>
      </div>
    </div>
  );
}

type Bought = BuildItemStat[] | "error" | null;

/** Compras por objeto de una build (7 días): alimenta "más comprados", el minuto de cada sección y las fichas. */
function useBought(buildId: number, tier: number | null): Bought {
  const key = `${buildId}:${tier ?? ""}`;
  const [data, setData] = useState<Bought>(() => boughtCache.get(key) ?? null);

  useEffect(() => {
    if (boughtCache.has(key)) return;
    const ctrl = new AbortController();
    fetch(`/api/builds/${buildId}/items${tier !== null ? `?rango=${tier}` : ""}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BuildItemStat[]>) : Promise.reject()))
      .then((d) => {
        boughtCache.set(key, d);
        setData(d);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        boughtCache.set(key, "error");
        setData("error");
      });
    return () => ctrl.abort();
  }, [key, buildId, tier]);

  return data;
}

/** Minuto aproximado de una sección: mediana del momento medio de compra de sus objetos. */
function sectionMinute(section: BuildDetail["sections"][number], byItem: Map<number, BuildItemStat>): number | null {
  const times = section.items
    .map((i) => byItem.get(i.itemId)?.avgBuyTime)
    .filter((t): t is number => typeof t === "number" && t > 0)
    .sort((x, y) => x - y);
  if (times.length === 0) return null;
  const mid = Math.floor(times.length / 2);
  const median = times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  return Math.max(1, Math.round(median / 60));
}

function MostBought({
  data,
  matches,
  items,
}: {
  data: Bought;
  matches: number;
  items: Record<number, BrowserItem>;
}) {
  const t = useT().builds.browser;
  const { pct } = useFormat();
  const top =
    data && data !== "error"
      ? data
          .filter((s) => items[s.itemId]?.upgrade && s.matches > 0)
          .sort((a, b) => b.matches - a.matches)
          .slice(0, 6)
      : [];

  return (
    <section aria-labelledby="mas-comprados">
      <h3 id="mas-comprados" className="text-sm font-bold uppercase tracking-[0.12em] text-brass">
        {t.mostBought}
      </h3>
      <p className="mt-1 text-xs text-ivory-dim">{t.mostBoughtHint}</p>
      {data === null ? (
        <ul className="mt-2" aria-busy="true" aria-label={t.loadingItems}>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-2.5 border-b border-brass-dim/40 py-1.5">
              <span className="size-[26px] bg-wine/60" />
              <span className="h-3 flex-1 bg-wine/40" />
            </li>
          ))}
        </ul>
      ) : data === "error" ? (
        <p className="mt-2 text-sm text-ivory-dim">{t.boughtError}</p>
      ) : top.length === 0 ? (
        <p className="mt-2 text-sm text-ivory-dim">{t.noBought}</p>
      ) : (
        <ul className="mt-2">
          {top.map((s) => {
            const item = items[s.itemId];
            const wr = s.wins / s.matches;
            return (
              <li key={s.itemId} className="flex items-center gap-2.5 border-b border-brass-dim/40 py-1.5">
                {item?.image ? (
                  <Image src={item.image} alt="" width={26} height={26} className="size-[26px] shrink-0 object-contain" />
                ) : (
                  <span className="size-[26px] shrink-0 bg-wine" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{item?.name ?? s.itemId}</span>
                <span className="text-right text-xs tabular-nums">
                  <span className="block text-ivory">{pct(Math.min(1, s.matches / matches), 0)}</span>
                  <span className={`block ${wr >= 0.5 ? "text-win" : "text-loss"}`}>{pct(wr)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SectionHeading({
  section: s,
  index,
  minute,
}: {
  section: BuildDetail["sections"][number];
  index: number;
  minute: number | null;
}) {
  const t = useT().builds.browser;
  const title = s.name || t.section(index + 1);
  const cls = "flex flex-wrap items-baseline gap-x-2 text-xs font-bold uppercase tracking-[0.12em] text-brass";
  const when = minute !== null && (
    <span
      className="font-semibold tracking-[0.08em] text-ivory-dim normal-case"
      title={t.minuteTitle}
    >
      {t.minute(minute)}
    </span>
  );
  const optional = s.optional && (
    <span className="border border-brass-dim px-1 py-px text-[0.65rem] tracking-[0.12em] text-ivory-dim">{t.optional}</span>
  );
  if (!s.description) {
    return (
      <h3 className={cls}>
        {title}
        {when}
        {optional}
      </h3>
    );
  }
  // La descripción del autor queda plegada: se abre con un clic en el título.
  return (
    <details className="group">
      <summary className={`${cls} cursor-pointer marker:text-brass-dim`}>
        <h3 className="contents">{title}</h3>
        {when}
        {optional}
      </summary>
      <p className="mt-1 max-w-[56ch] text-sm font-normal normal-case tracking-normal text-ivory-dim">{s.description}</p>
    </details>
  );
}

/** Icono de objeto: al pasar el ratón (o con el foco) muestra su ficha; al pulsar lleva a su página. */
function ItemTile({
  id,
  item,
  note,
  stat,
  matches,
}: {
  id: number;
  item: BrowserItem | undefined;
  note: string;
  stat: BuildItemStat | undefined;
  matches: number;
}) {
  const t = useT().builds.browser;
  const { pct, duration, souls } = useFormat();
  const roles = useT().common.slotNames;
  const ref = useRef<HTMLLIElement>(null);
  const [place, setPlace] = useState({ right: false, above: false });
  const color = (item?.slot && SLOT_VAR[item.slot]) || "var(--brass-dim)";
  const name = item?.name ?? t.unknownItem;

  // La ficha se abre hacia donde haya sitio: a la izquierda o a la derecha, arriba o abajo del icono.
  function locate() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPlace({
      right: r.left + 256 > window.innerWidth - 16,
      above: r.bottom + 280 > window.innerHeight && r.top > 280,
    });
  }

  const box = (
    <>
      {item?.image && <Image src={item.image} alt="" width={40} height={40} className="size-[72%] object-contain" />}
      {item?.tier ? (
        <span
          className="absolute top-0 right-0 px-[3px] text-[0.6rem] leading-[1.35] font-bold text-ox-deep"
          style={{ background: color }}
          aria-hidden="true"
        >
          {ROMAN[item.tier] ?? item.tier}
        </span>
      ) : null}
      {note && <span className="absolute bottom-[3px] left-[3px] size-1.5 rounded-full bg-ivory" aria-hidden="true" />}
    </>
  );
  const boxClass = "relative grid size-11 place-items-center border no-underline sm:size-12";
  const boxStyle = {
    borderColor: `color-mix(in oklab, ${color} 70%, transparent)`,
    background: `color-mix(in oklab, ${color} 22%, var(--ox-deep))`,
  };
  const wr = stat && stat.matches > 0 ? stat.wins / stat.matches : null;

  return (
    <li ref={ref} onMouseEnter={locate} onFocus={locate} className="group relative">
      {item?.inShop ? (
        <Link
          href={`/objetos/${id}`}
          aria-label={t.viewPage(name)}
          className={`${boxClass} transition-[filter] hover:brightness-125`}
          style={boxStyle}
        >
          {box}
        </Link>
      ) : (
        <span role="img" aria-label={name} tabIndex={0} className={boxClass} style={boxStyle}>
          {box}
        </span>
      )}
      <div
        role="tooltip"
        className={`pointer-events-none absolute z-30 hidden w-64 max-w-[calc(100vw-2rem)] border border-brass bg-ox-deep p-3 text-left shadow-[0_12px_32px_rgb(0_0_0/0.55)] transition-[opacity,display] transition-discrete duration-150 group-focus-within:block group-hover:block starting:opacity-0 ${
          place.right ? "right-0" : "left-0"
        } ${place.above ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
      >
        <p className="flex items-baseline justify-between gap-3">
          <span className="font-bold text-ivory">{name}</span>
          {item?.cost != null && <span className="shrink-0 text-xs text-brass">{souls(item.cost)} {t.souls}</span>}
        </p>
        {item && (item.slot || item.tier) && (
          <p className="mt-0.5 text-xs tracking-[0.1em] uppercase" style={{ color }}>
            {item.slot ? (roles[item.slot] ?? item.slot) : ""}
            {item.tier ? ` · ${t.level} ${ROMAN[item.tier] ?? item.tier}` : ""}
          </p>
        )}
        {item?.quip && <p className="mt-2 text-sm text-ivory-dim">{item.quip}</p>}
        {note && (
          <p className="mt-2 border-t border-brass-dim/50 pt-2 text-sm text-ivory">
            <span className="block text-[0.65rem] font-bold tracking-[0.12em] text-brass uppercase">{t.authorNote}</span>
            {note}
          </p>
        )}
        {stat && wr !== null && (
          <p className="mt-2 border-t border-brass-dim/50 pt-2 text-xs text-ivory-dim tabular-nums">
            {t.boughtIn(pct(Math.min(1, stat.matches / Math.max(matches, 1)), 0))}
            <span className={wr >= 0.5 ? "text-win" : "text-loss"}>{pct(wr)}</span> {t.winsSuffix}
            {stat.avgBuyTime
              ? t.aroundMinute(Math.max(1, Math.round(stat.avgBuyTime / 60)), duration(Math.round(stat.avgBuyTime)))
              : ""}
          </p>
        )}
        {item?.inShop && (
          <p className="mt-2 text-xs font-semibold tracking-[0.1em] text-brass uppercase">{t.clickItem}</p>
        )}
      </div>
    </li>
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
