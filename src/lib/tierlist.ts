/** Utilidades compartidas por la vista «por rango» y el editor de la tier list. */

export type Row = { label: string; heroes: number[] };

export const STORAGE_KEY = "deadlock-tierlist-v1";
export const MAX_ROWS = 8;
export const EDITOR_PATH = "/herramientas/tierlist/mia";

/** Formato de enlace y de almacenamiento: S~1.2.3|A~4|B~ */
export function encodeRows(rows: Row[]): string {
  return rows.map((r) => `${encodeURIComponent(r.label)}~${r.heroes.join(".")}`).join("|");
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function decodeRows(s: string, known: Set<number>): Row[] | null {
  const rows = s.split("|").map((part) => {
    const [label, ids = ""] = part.split("~");
    return {
      label: safeDecode(label ?? "").slice(0, 12),
      heroes: ids
        .split(".")
        .map(Number)
        .filter((n) => known.has(n)),
    };
  });
  if (rows.length === 0 || rows.length > MAX_ROWS) return null;
  // Un héroe solo puede estar en una fila.
  const seen = new Set<number>();
  for (const r of rows) r.heroes = r.heroes.filter((h) => !seen.has(h) && seen.add(h));
  return rows;
}

/** Tono de la etiqueta de una fila: de latón pleno (arriba) a granate (abajo). */
export function tierTone(i: number, n: number) {
  const t = n <= 1 ? 0 : i / (n - 1);
  return {
    background: `color-mix(in oklab, var(--brass) ${Math.round((1 - t) * 100)}%, var(--wine-raised))`,
    color: t < 0.55 ? "var(--ox-deep)" : "var(--ivory)",
  };
}
