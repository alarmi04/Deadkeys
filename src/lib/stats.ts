import type { MatchRow } from "@/lib/api";
import { kda } from "@/lib/format";

/** Totales de un conjunto de partidas; los ratios se calculan sobre sumas, no sobre medias de medias. */
export function summarize(ms: MatchRow[]) {
  const t = { n: ms.length, wins: 0, k: 0, d: 0, a: 0, souls: 0, secs: 0, lastHits: 0 };
  for (const m of ms) {
    if (m.won) t.wins++;
    t.k += m.kills;
    t.d += m.deaths;
    t.a += m.assists;
    t.souls += m.netWorth;
    t.secs += m.duration;
    t.lastHits += m.lastHits;
  }
  const mins = Math.max(t.secs / 60, 1);
  return {
    ...t,
    losses: t.n - t.wins,
    winRate: t.n ? t.wins / t.n : 0,
    kda: kda(t.k, t.d, t.a),
    kd: t.k / Math.max(t.d, 1),
    killsAvg: t.n ? t.k / t.n : 0,
    deathsAvg: t.n ? t.d / t.n : 0,
    assistsAvg: t.n ? t.a / t.n : 0,
    soulsPerMin: t.souls / mins,
    soulsAvg: t.n ? t.souls / t.n : 0,
    lastHitsAvg: t.n ? t.lastHits / t.n : 0,
    lastHitsPerMin: t.lastHits / mins,
    durationAvg: t.n ? t.secs / t.n : 0,
  };
}
