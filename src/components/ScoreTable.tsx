import Image from "next/image";
import Link from "@/components/Link";
import { HeroIcon } from "@/components/HeroIcon";
import { TeamMark } from "@/components/TeamMark";
import type { Hero, Item, MatchPlayer } from "@/lib/api";
import { getT } from "@/i18n/server";
import { isHiddenId } from "@/lib/blocklist";
import { getFormat } from "@/i18n/server-format";

export type Best = { souls: number; kills: number; assists: number; damage: number; boss: number; healing: number };

/** El mejor valor de la partida en cada columna va resaltado, como en el marcador del juego. */
function mark(v: number, top: number, text: string) {
  return v > 0 && v === top ? <span className="top-stat">{text}</span> : text;
}

export async function ScoreTable({
  team,
  won,
  players,
  total,
  best,
  focus,
  heroes,
  items,
  names,
}: {
  team: 0 | 1;
  won: boolean;
  players: MatchPlayer[];
  total: number;
  best: Best;
  focus: number | null;
  heroes: Map<number, Hero>;
  items: Map<number, Item>;
  names: Record<string, string>;
}) {
  const m = await getT();
  const t = m.matches.table;
  const { souls } = await getFormat();
  const sorted = [...players].sort((a, b) => b.netWorth - a.netWorth);
  return (
    <div className="mt-10" data-team={team}>
      <div className="score-row score-head">
        <h3 className="team-name">
          <TeamMark team={team} lang={m.lang} height={48} />
          <span className={`ml-4 font-sans text-sm font-semibold tracking-normal ${won ? "text-win" : "text-loss"}`}>
            {won ? t.win : t.loss}
          </span>
        </h3>
        <span className="num">{t.souls}</span>
        <span className="num">K</span>
        <span className="num">{m.lang === "es" ? "M" : "D"}</span>
        <span className="num">A</span>
        <span className="num hidden lg:block">{t.heroDamage}</span>
        <span className="num hidden lg:block">{t.objDamage}</span>
        <span className="num hidden lg:block">{t.healing}</span>
        <span className="hidden lg:block">{t.items}</span>
      </div>
      <ol>
        {sorted.map((p) => {
          const hero = heroes.get(p.heroId);
          const hidden = isHiddenId(p.accountId);
          const name = hidden ? m.common.hiddenPlayer : (names[p.accountId] ?? t.account(p.accountId));
          const me = p.accountId === focus;
          return (
            <li key={p.accountId} className="score-row score-player" data-me={me || undefined}>
              <div className="flex min-w-0 items-center gap-3">
                <HeroIcon hero={hero} size={52} />
                <div className="min-w-0 leading-tight">
                  {hidden ? (
                    <span className="block truncate font-semibold text-ivory-dim">{name}</span>
                  ) : (
                    <Link
                      href={`/jugadores/${p.accountId}`}
                      className="block truncate font-semibold no-underline hover:text-brass"
                    >
                      {name}
                    </Link>
                  )}
                  <span className="block truncate text-sm text-ivory-dim">
                    {hero?.name ?? p.heroId} · {t.lvl} {p.level}
                  </span>
                </div>
              </div>
              <span className="num font-semibold">{mark(p.netWorth, best.souls, souls(p.netWorth))}</span>
              <span className="num font-semibold">{mark(p.kills, best.kills, String(p.kills))}</span>
              <span className="num text-ivory-dim">{p.deaths}</span>
              <span className="num font-semibold">{mark(p.assists, best.assists, String(p.assists))}</span>
              <span className="num hidden lg:block">{mark(p.damage, best.damage, souls(p.damage))}</span>
              <span className="num hidden lg:block">{mark(p.bossDamage, best.boss, souls(p.bossDamage))}</span>
              <span className="num hidden lg:block">{mark(p.healing, best.healing, souls(p.healing))}</span>
              <ul className="score-items">
                {p.itemIds.slice(0, 12).map((id) => {
                  const item = items.get(id);
                  return (
                    <li key={id} title={item?.name} className="size-7 shrink-0 bg-ox-deep/60">
                      {item?.image && (
                        <Image src={item.image} alt={item.name} width={28} height={28} className="size-7 object-contain" />
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="col-span-full text-xs text-ivory-dim lg:hidden">
                {t.mobile(souls(p.damage), souls(p.bossDamage), souls(p.healing))}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="score-total">
        <span>{souls(total)}</span>
      </p>
    </div>
  );
}
