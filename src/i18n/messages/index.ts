import type { Locale } from "../config";
import { common } from "./common";
import { tracker } from "./tracker";
import { players } from "./players";
import { matches } from "./matches";
import { pages } from "./pages";
import { map } from "./map";
import { patches } from "./patches";
import { tierlist } from "./tierlist";
import { items } from "./items";
import { builds } from "./builds";
import { heroes } from "./heroes";
import { home } from "./home";
import { matchup } from "./matchup";

const parts = { common, home, heroes, builds, items, tierlist, patches, map, pages, matches, players, tracker, matchup };

type Parts = typeof parts;
export type Messages = { lang: Locale } & { [K in keyof Parts]: Parts[K]["es"] };

function build(lang: Locale): Messages {
  const out: Record<string, unknown> = { lang };
  for (const [k, v] of Object.entries(parts)) out[k] = (v as Record<Locale, unknown>)[lang];
  return out as Messages;
}

export const messages: Record<Locale, Messages> = { es: build("es"), en: build("en") };
