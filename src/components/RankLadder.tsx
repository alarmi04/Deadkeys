import Image from "next/image";
import { type Rank, type RankBin, rankImage } from "@/lib/api";
import { getT } from "@/i18n/server";
import { getFormat } from "@/i18n/server-format";
import { SUBRANKS } from "@/lib/tracker";

export type LadderMark = { slot: "a" | "b"; name: string; badge: number };

const CHART_H = 128;
const TAGS_H = 68;

/**
 * Cuántos jugadores hay en cada subrango, de Iniciado a Eternus, con cada jugador marcado en su sitio.
 * La altura de la barra es el número real de jugadores; los marcadores muestran de un vistazo quién
 * está más arriba y cuánta gente queda entre los dos.
 */
export async function RankLadder({
  bins,
  ranks,
  marks,
}: {
  bins: RankBin[];
  ranks: Rank[];
  marks: LadderMark[];
}) {
  const t = (await getT()).tracker.ladder;
  const { num } = await getFormat();
  const max = Math.max(...bins.map((b) => b.players), 1);
  const tiers = [...new Set(bins.map((b) => b.tier))];
  const total = bins.reduce((a, b) => a + b.players, 0);
  const tag = { a: "bg-pa", b: "bg-pb" } as const;

  return (
    <figure>
      <div
        className="grid gap-x-px sm:gap-x-0.5"
        style={{ gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` }}
      >
        {bins.map((b, i) => {
          const here = marks.filter((m) => m.badge === b.badge);
          const both = here.length === 2;
          const fill = both
            ? "linear-gradient(90deg, var(--team-amber) 50%, var(--team-sapphire) 50%)"
            : here[0]
              ? here[0].slot === "a"
                ? "var(--team-amber)"
                : "var(--team-sapphire)"
              : undefined;
          const edge = i < 9 ? "left-0" : i > bins.length - 10 ? "right-0" : "left-1/2 -translate-x-1/2";
          return (
            <div
              key={b.badge}
              className="relative flex items-end"
              style={{ height: CHART_H + TAGS_H }}
              title={t.title(num(b.players), b.tier, b.subrank)}
            >
              {here.map((m) => (
                <span key={m.slot}>
                  <span
                    className={`absolute left-1/2 w-0.5 -translate-x-1/2 ${tag[m.slot]}`}
                    style={{ top: m.slot === "a" ? 22 : 54, bottom: 0 }}
                  />
                  <span
                    className={`absolute z-10 max-w-[12rem] truncate whitespace-nowrap px-2 py-0.5 text-xs font-bold text-ox-deep ${tag[m.slot]} ${edge}`}
                    style={{ top: m.slot === "a" ? 0 : 32 }}
                  >
                    {m.slot === "a" ? "1" : "2"} · {m.name}
                  </span>
                </span>
              ))}
              <span
                className={`block w-full ${here.length ? "" : "bg-brass-dim/60"}`}
                style={{
                  height: Math.max(2, (b.players / max) * CHART_H),
                  background: fill,
                }}
              />
            </div>
          );
        })}

        {tiers.map((tr) => {
          const img = rankImage(ranks, tr, 1);
          const name = ranks.find((r) => r.tier === tr)?.name ?? t.rankN(tr);
          return (
            <div
              key={tr}
              className="mt-1.5 flex min-w-0 flex-col items-center gap-0.5 border-t border-brass-dim pt-1.5 text-center"
              style={{ gridColumn: `span ${SUBRANKS}` }}
            >
              {img ? (
                <Image src={img} alt="" width={28} height={28} className="size-6 sm:size-7" />
              ) : (
                <span className="text-sm font-semibold text-ivory-dim">{tr}</span>
              )}
              <span className="hidden max-w-full truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ivory-dim md:block">
                {name}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 text-xs text-ivory-dim">
        {t.caption(num(total))}
      </figcaption>
    </figure>
  );
}
