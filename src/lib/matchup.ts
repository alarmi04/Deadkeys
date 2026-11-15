import type { Item, ItemRecord } from "@/lib/api";

export type Phase = "early" | "mid" | "late";
export const PHASES: Phase[] = ["early", "mid", "late"];

/** Fase de la partida según el escalón de precio del objeto: 800/1.600 al inicio, 3.200 a mitad, 6.400+ al final. */
export function phaseOf(tier: number | null): Phase | null {
  if (tier === null) return null;
  return tier <= 2 ? "early" : tier === 3 ? "mid" : "late";
}

/** Un objeto en el cruce, listo para pintar (serializable para el cliente). */
export type MatchupItem = {
  id: number;
  name: string;
  image: string;
  slot: string | null;
  phase: Phase;
  matches: number;
  winRate: number;
  /**
   * Cuánto mejor (o peor) rinde el objeto contra este rival que normalmente, en tanto por uno,
   * comparado con lo que se mueve el objeto típico en este cruce:
   * (WR objeto vs rival − WR objeto general) − media ponderada de esa misma diferencia.
   * Se compara con el resto de objetos y no con el % del héroe porque cada objeto solo cuenta
   * las partidas en que se compra, y eso desplaza todos los porcentajes por igual.
   */
  lift: number;
  /** Minuto medio de compra contra este rival. */
  buyMinute: number;
};

/**
 * Mínimo de partidas para que un objeto cuente: el 1 % de las partidas del cruce, y nunca menos de 100.
 * Con menos, la diferencia de un par de puntos es ruido.
 */
export function minSample(duelMatches: number): number {
  return Math.max(100, Math.round(duelMatches * 0.01));
}

export function matchupItems({
  pair,
  general,
  items,
  min,
}: {
  pair: Record<number, ItemRecord>;
  general: Record<number, ItemRecord>;
  items: Item[];
  min: number;
}): MatchupItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const out: MatchupItem[] = [];
  let weight = 0;
  let shift = 0;
  for (const [key, rec] of Object.entries(pair)) {
    const item = byId.get(Number(key));
    const gen = general[Number(key)];
    if (!item || item.type !== "upgrade" || !item.inShop || !gen || rec.matches < min) continue;
    const phase = phaseOf(item.tier);
    if (!phase) continue;
    const winRate = rec.wins / rec.matches;
    const diff = winRate - gen.wins / gen.matches;
    weight += rec.matches;
    shift += diff * rec.matches;
    out.push({
      id: item.id,
      name: item.name,
      image: item.image,
      slot: item.slot,
      phase,
      matches: rec.matches,
      winRate,
      lift: diff,
      buyMinute: Math.round(rec.avgBuyTime / 60),
    });
  }
  const mean = weight > 0 ? shift / weight : 0;
  return out.map((r) => ({ ...r, lift: r.lift - mean }));
}

export type BuildFit = {
  /** Media de `lift` de los objetos de la build con datos, ponderada por sus partidas. */
  fit: number;
  covered: number;
  total: number;
};

export function buildFit(itemIds: number[], rows: Map<number, MatchupItem>): BuildFit | null {
  const unique = [...new Set(itemIds)];
  let weight = 0;
  let sum = 0;
  let covered = 0;
  for (const id of unique) {
    const r = rows.get(id);
    if (!r) continue;
    covered++;
    weight += r.matches;
    sum += r.lift * r.matches;
  }
  return covered === 0 ? null : { fit: sum / weight, covered, total: unique.length };
}

/** Por debajo de esto la diferencia se redondea a 0,0 puntos: ni signo ni color. */
const ZERO = 0.0005;

/** Signo para mostrar una diferencia en puntos: "+", "−" o nada si se redondea a cero. */
export function liftSign(v: number): string {
  return Math.abs(v) < ZERO ? "" : v > 0 ? "+" : "−";
}

/** Color de una diferencia: verde si suma, rojo si resta, neutro si es cero. */
export function liftTone(v: number): string {
  return Math.abs(v) < ZERO ? "text-ivory-dim" : v > 0 ? "text-win" : "text-loss";
}
