import type { MatchRow, RankBin } from "@/lib/api";

export const SUBRANKS = 6;

/** Escalón en la escalera completa: 1 (rango 1, subrango 1) … 66 (rango 11, subrango 6). */
export const rankStep = (tier: number, subrank: number) => (tier - 1) * SUBRANKS + subrank;

/**
 * Qué parte de los jugadores clasificados queda por debajo de un subrango. Los que comparten
 * subrango cuentan por la mitad, para que el percentil del rango más poblado no salga inflado.
 */
export function standing(dist: RankBin[], badge: number) {
  let total = 0;
  let below = 0;
  for (const b of dist) {
    total += b.players;
    if (b.badge < badge) below += b.players;
    else if (b.badge === badge) below += b.players / 2;
  }
  return { total, share: total ? below / total : 0 };
}

export type Shared = { a: MatchRow; b: MatchRow; rivals: boolean };

/**
 * Partidas en las que aparecen los dos. Si el resultado es el mismo estaban en el mismo equipo;
 * si no, se enfrentaron. De más reciente a más antigua.
 */
export function headToHead(a: MatchRow[], b: MatchRow[]) {
  const theirs = new Map(b.map((m) => [m.matchId, m]));
  const shared: Shared[] = [];
  for (const m of a) {
    const o = theirs.get(m.matchId);
    if (o) shared.push({ a: m, b: o, rivals: m.won !== o.won });
  }
  shared.sort((x, y) => y.a.start - x.a.start);
  const rivals = shared.filter((s) => s.rivals);
  const allies = shared.filter((s) => !s.rivals);
  return {
    shared,
    rivals,
    allies,
    aWins: rivals.filter((s) => s.a.won).length,
    bWins: rivals.filter((s) => s.b.won).length,
    alliesWon: allies.filter((s) => s.a.won).length,
  };
}

/** Últimas partidas (el historial viene de más reciente a más antigua) y la racha en curso. */
export function recentForm(ms: MatchRow[], n = 10) {
  const last = ms.slice(0, n);
  const wins = last.filter((m) => m.won).length;
  let streak = 0;
  for (const m of ms) {
    if (m.won !== ms[0]?.won) break;
    streak++;
  }
  return { last, wins, losses: last.length - wins, streak, streakWon: ms[0]?.won ?? false };
}
