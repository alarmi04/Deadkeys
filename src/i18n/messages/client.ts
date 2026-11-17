import type { Locale } from "../config";
import { builds } from "./builds";
import { common } from "./common";
import { heroes } from "./heroes";
import { map } from "./map";
import { matchup } from "./matchup";
import { players } from "./players";
import { tierlist } from "./tierlist";

/**
 * Solo los textos que usan los componentes de cliente: este módulo va en el JavaScript de todas las páginas,
 * así que los textos que solo se pintan en el servidor (legales, tracker, partidas…) se quedan fuera.
 * Si un componente de cliente necesita otra sección, añádela aquí (TypeScript avisa si falta).
 */
const parts = { common, builds, heroes, map, matchup, players, tierlist };

type Parts = typeof parts;
export type ClientMessages = { lang: Locale } & { [K in keyof Parts]: Parts[K]["es"] };

function build(lang: Locale): ClientMessages {
  const out: Record<string, unknown> = { lang };
  for (const [k, v] of Object.entries(parts)) out[k] = (v as Record<Locale, unknown>)[lang];
  return out as ClientMessages;
}

export const clientMessages: Record<Locale, ClientMessages> = { es: build("es"), en: build("en") };
