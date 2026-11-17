import { cacheLife } from "next/cache";
import type { Locale } from "@/i18n/config";
import { getBlockedSet, hiddenId } from "@/lib/blocklist";

const API = "https://api.deadlock-api.com";

export class ApiError extends Error {
  constructor(
    public status: number,
    public path: string,
  ) {
    super(`Deadlock API ${status} en ${path}`);
  }
}

async function get<T>(path: string, retries = 1): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
  } catch (e) {
    // Corte de red o respuesta truncada (JSON incompleto): se reintenta una vez antes de rendirse.
    if (retries > 0) return get<T>(path, retries - 1);
    throw e;
  }
  throw new ApiError(res.status, path);
}

/* ---------- Tipos (solo los campos que usamos) ---------- */

export type Hero = {
  id: number;
  name: string;
  card: string;
  small: string;
  /** Se puede elegir en partida (excluye héroes desactivados o solo de pruebas). */
  playable: boolean;
};

export type HeroStat = {
  heroId: number;
  wins: number;
  matches: number;
  winRate: number;
  pickRate: number;
  kills: number;
  deaths: number;
  assists: number;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  heroIds: number[];
  badge: number | null;
  /** Cuentas que podrían ser esta entrada: la API no confirma cuál. */
  accountIds: number[];
};

export type ActivePlayer = { accountId: number; heroId: number };

export type ActiveMatch = {
  matchId: number;
  /** Nombre del modo ("Normal", "Street Brawl") o null si es otro. */
  mode: string | null;
  ranked: boolean;
  region: Region | null;
  spectators: number;
  /** Segundos transcurridos desde el inicio (en el momento de la consulta). */
  elapsed: number | null;
  netWorth: [number, number];
  teams: [ActivePlayer[], ActivePlayer[]];
};

export type Patch = {
  title: string;
  date: string;
  link: string;
  source: "steam" | "forum";
  /** Actualización de juego (cambios de balance) o noticia (eventos, temporadas, comunicados). */
  kind: "update" | "news";
  /** Primeras líneas del texto, sin formato. Vacío en las entradas del foro. */
  excerpt: string;
  /** Imagen de cabecera de la noticia de Steam, si la hay. */
  image: string | null;
};

export type Rank = {
  tier: number;
  name: string;
  color: string;
  images: Record<string, string>;
};

export type SteamProfile = {
  accountId: number;
  name: string;
  avatar: string;
  avatarFull: string;
  profileUrl: string;
  country: string | null;
  matchesLast30d: number | null;
};

export type PlayerRank = { badge: number; tier: number; subrank: number };

export type MatchRow = {
  matchId: number;
  heroId: number;
  start: number;
  duration: number;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  lastHits: number;
  ranked: boolean;
  abandoned: boolean;
};

export type PlayerHeroStat = {
  heroId: number;
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  networthPerMin: number;
  lastPlayed: number;
};

/* ---------- Datos de juego (cambian con cada parche) ---------- */

export async function getHeroes(): Promise<Hero[]> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = {
    id: number;
    name: string;
    images: Record<string, string | undefined>;
    player_selectable?: boolean;
    disabled?: boolean;
  };
  // Sin filtrar: las estadísticas y partidas pueden incluir héroes que el listado "activo" omite.
  const raw = await get<Raw[]>("/v1/assets/heroes");
  return raw.map((h) => ({
      id: h.id,
      name: h.name,
      card: h.images.icon_hero_card_webp ?? h.images.icon_hero_card ?? "",
      small: h.images.icon_image_small_webp ?? h.images.icon_image_small ?? "",
      playable: h.player_selectable === true && h.disabled !== true,
    }));
}

export async function getRanks(): Promise<Rank[]> {
  "use cache: remote";
  cacheLife("days");
  type Raw = { tier: number; name: string; color: string; images: Record<string, string> };
  const raw = await get<Raw[]>("/v1/assets/ranks");
  return raw.map((r) => ({ tier: r.tier, name: r.name, color: r.color, images: r.images }));
}

export function rankImage(ranks: Rank[], tier: number, subrank: number): string | null {
  const r = ranks.find((x) => x.tier === tier);
  return r?.images[`small_subrank${subrank}_webp`] ?? r?.images[`small_subrank${subrank}`] ?? null;
}

/* ---------- Meta ---------- */

/** Estadísticas por héroe en partidas normales de los últimos 30 días; con `tier`, solo partidas de ese rango medio. */
export async function getHeroStats(
  tier: number | null = null,
): Promise<{ stats: HeroStat[]; totalMatches: number; since: number }> {
  "use cache: remote";
  cacheLife("hours");
  const day = 86_400;
  const since = Math.floor(Date.now() / 1000 / day) * day - 30 * day;
  type Raw = {
    hero_id: number;
    wins: number;
    matches: number;
    total_kills: number;
    total_deaths: number;
    total_assists: number;
  };
  const raw = await get<Raw[]>(
    `/v1/analytics/hero-stats?game_mode=normal&min_unix_timestamp=${since}${badgeRange(tier)}`,
  );
  // Cada partida tiene 12 jugadores: el total de partidas es la suma / 12.
  const totalMatches = Math.round(raw.reduce((a, r) => a + r.matches, 0) / 12);
  const stats = raw
    .filter((r) => r.matches > 0)
    .map((r) => ({
      heroId: r.hero_id,
      wins: r.wins,
      matches: r.matches,
      winRate: r.wins / r.matches,
      pickRate: r.matches / totalMatches,
      kills: r.total_kills / r.matches,
      deaths: r.total_deaths / r.matches,
      assists: r.total_assists / r.matches,
    }))
    .sort((a, b) => b.winRate - a.winRate);
  return { stats, totalMatches, since };
}

export const REGIONS = {
  Europe: "Europa",
  NAmerica: "Norteamérica",
  SAmerica: "Sudamérica",
  Asia: "Asia",
  Oceania: "Oceanía",
} as const;
export type Region = keyof typeof REGIONS;

async function getLeaderboardAll(region: Region): Promise<LeaderboardEntry[]> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = {
    entries: {
      rank: number;
      account_name: string;
      top_hero_ids: number[];
      badge_level?: number | null;
      possible_account_ids?: number[];
    }[];
  };
  const raw = await get<Raw>(`/v1/leaderboard/${region}`);
  return raw.entries.map((e) => ({
    rank: e.rank,
    name: e.account_name,
    heroIds: e.top_hero_ids ?? [],
    badge: e.badge_level ?? null,
    accountIds: e.possible_account_ids ?? [],
  }));
}

/** Clasificación regional sin los jugadores bloqueados (la API da varias cuentas posibles por entrada: si alguna está bloqueada se oculta la entrada). */
export async function getLeaderboard(region: Region, limit = 10): Promise<LeaderboardEntry[]> {
  const [all, blocked] = await Promise.all([getLeaderboardAll(region), getBlockedSet()]);
  return all.filter((e) => !e.accountIds.some((id) => blocked.has(id))).slice(0, limit);
}

const MODE_LABEL: Record<string, string> = {
  KECitadelGameModeNormal: "Normal",
  KECitadelGameModeStreetBrawl: "Street Brawl",
};
const REGION_KEY: Record<string, Region> = {
  europe: "Europe",
  row: "NAmerica",
  s_america: "SAmerica",
  sea: "Asia",
  oceania: "Oceania",
};

/** Parámetro de idioma de la API de assets (inglés es el predeterminado). */
const langParam = (lang: Locale) => (lang === "es" ? "?language=spanish" : "");

type RawActive = {
  match_id: number;
  game_mode_parsed: string | null;
  region_mode_parsed: string | null;
  spectators: number | null;
  net_worth_team_0: number | null;
  net_worth_team_1: number | null;
  match_score: number | null;
  match_mode_parsed: string | null;
  start_time: number | null;
  players: { team: number; hero_id: number; account_id: number }[];
};

const toActive = (m: RawActive): ActiveMatch => ({
  matchId: m.match_id,
  ranked: m.match_mode_parsed === "Ranked",
  elapsed: m.start_time ? Math.max(Math.floor(Date.now() / 1000) - m.start_time, 0) : null,
  mode: MODE_LABEL[m.game_mode_parsed ?? ""] ?? null,
  region: REGION_KEY[m.region_mode_parsed ?? ""] ?? null,
  spectators: m.spectators ?? 0,
  netWorth: [m.net_worth_team_0 ?? 0, m.net_worth_team_1 ?? 0],
  teams: [0, 1].map((t) =>
    m.players.filter((p) => p.team === t).map((p) => ({ accountId: p.account_id, heroId: p.hero_id })),
  ) as [ActivePlayer[], ActivePlayer[]],
});

async function fetchActiveMatches(limit: number): Promise<{ total: number; matches: ActiveMatch[] }> {
  "use cache";
  cacheLife("minutes");
  const raw = await get<RawActive[]>("/v1/matches/active");
  const matches = raw
    .filter((m) => m.game_mode_parsed === "KECitadelGameModeNormal")
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, limit)
    .map(toActive);
  return { total: raw.length, matches };
}

/** Una partida en curso por su ID, o null si ya ha terminado. */
async function fetchActiveMatch(matchId: number): Promise<ActiveMatch | null> {
  "use cache";
  cacheLife("minutes");
  const raw = await get<RawActive[]>("/v1/matches/active");
  const m = raw.find((x) => x.match_id === matchId);
  return m ? toActive(m) : null;
}

/** Sustituye a los jugadores bloqueados por «jugador oculto» (ID negativo, sin identidad). */
const hideBlocked = (m: ActiveMatch, blocked: Set<number>): ActiveMatch => ({
  ...m,
  teams: m.teams.map((team, t) =>
    team.map((p, i) => (blocked.has(p.accountId) ? { accountId: hiddenId(t * 100 + i), heroId: p.heroId } : p)),
  ) as [ActivePlayer[], ActivePlayer[]],
});

export async function getActiveMatches(limit = 6): Promise<{ total: number; matches: ActiveMatch[] }> {
  const [res, blocked] = await Promise.all([fetchActiveMatches(limit), getBlockedSet()]);
  return { total: res.total, matches: res.matches.map((m) => hideBlocked(m, blocked)) };
}

export async function getActiveMatch(matchId: number): Promise<ActiveMatch | null> {
  const [m, blocked] = await Promise.all([fetchActiveMatch(matchId), getBlockedSet()]);
  return m ? hideBlocked(m, blocked) : null;
}

export type GameMap = { image: string; frame: string };

export async function getMap(): Promise<GameMap> {
  "use cache: remote";
  cacheLife("days");
  const raw = await get<{ images: Record<string, string> }>("/v1/assets/map");
  return { image: raw.images.minimap, frame: raw.images.frame };
}

const IMAGE_HOSTS = new Set(["clan.fastly.steamstatic.com", "clan.akamai.steamstatic.com"]);
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function patchExcerpt(html: string): string {
  const text = html
    .replace(/<(br|\/p|\/li|\/div)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|\w+);/g, (m, e: string) =>
      e.startsWith("#") ? String.fromCodePoint(Number(e.slice(1))) : (ENTITIES[e] ?? m),
    )
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 220) return text;
  return text.slice(0, 220).replace(/\s+\S*$/, "") + "…";
}

function patchImage(html: string): string | null {
  const src = html.match(/<img[^>]+src="([^"]+)"/i)?.[1];
  if (!src) return null;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && IMAGE_HOSTS.has(url.host) ? url.href : null;
  } catch {
    return null;
  }
}

export async function getPatches(limit = 4): Promise<Patch[]> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = { title: string; pub_date: string; link: string; source: string; content?: string };
  const raw = await get<Raw[]>("/v2/patches");
  return raw
    .sort((a, b) => b.pub_date.localeCompare(a.pub_date))
    .slice(0, limit)
    .map((p) => {
      const source = p.source === "forum" ? "forum" : "steam";
      const title = p.title.trim();
      const content = source === "steam" ? (p.content ?? "") : "";
      return {
        title,
        date: p.pub_date,
        link: p.link,
        source,
        kind: /update|^\d{2}-\d{2}-\d{4}/i.test(title) ? "update" : "news",
        excerpt: patchExcerpt(content),
        image: patchImage(content),
      };
    });
}

export async function getMatchesPerDay(): Promise<number | null> {
  "use cache: remote";
  cacheLife("hours");
  const raw = await get<{ fetched_matches_per_day?: number }>("/v1/info");
  return raw.fetched_matches_per_day ?? null;
}

/* ---------- Detalle de héroe ---------- */

export type Item = {
  id: number;
  className: string;
  name: string;
  image: string;
  type: "ability" | "weapon" | "upgrade";
  slot: string | null;
  tier: number | null;
  cost: number | null;
  quip: string | null;
  /** false si el objeto ya no está en la tienda (retirado o desactivado). */
  inShop: boolean;
};

export type PopularItem = { itemId: number; pickRate: number; winRate: number };

export type HeroDetail = {
  id: number;
  name: string;
  role: string;
  playstyle: string;
  lore: string;
  tags: string[];
  gunTag: string;
  type: string;
  complexity: number;
  color: string | null;
  background: string;
  stats: { key: string; value: number }[];
  abilityClasses: string[];
  popular: { early: PopularItem[]; mid: PopularItem[]; late: PopularItem[] };
};

export type BuildCategory = { name: string; description: string; itemIds: number[] };
export type HeroBuild = {
  id: number;
  name: string;
  description: string;
  favorites: number;
  categories: BuildCategory[];
};

type RawItem = RawAbility & {
  id: number;
  type: Item["type"];
  image_webp?: string;
  image?: string;
  shop_image_webp?: string;
  shop_image?: string;
  item_slot_type?: string;
  item_tier?: number;
  cost?: number;
  shopable?: boolean;
  disabled?: boolean;
};

/**
 * Objetos y fichas de habilidad salen del mismo listado (~500 KB por idioma): se descarga una sola vez
 * por idioma y se guarda ya convertido, en lugar de pedirlo por separado para cada uso.
 */
async function getItemData(lang: Locale): Promise<{ items: Item[]; tips: Record<string, AbilityTip> }> {
  "use cache: remote";
  cacheLife("days");
  const [raw, es] = await Promise.all([
    get<RawItem[]>("/v1/assets/items"),
    lang === "es" ? get<RawItem[]>("/v1/assets/items?language=spanish").catch(() => null) : Promise.resolve(null),
  ]);
  // Las fichas van en el idioma pedido; si el listado en español falla, en inglés antes que sin fichas.
  const local = es ?? raw;
  NF = NUMBER_FORMATS[es ? lang : "en"];
  const tips = Object.fromEntries(local.filter((i) => i.type === "ability").map((i) => [i.class_name, toTip(i)]));
  return { items: toItems(raw, es ?? []), tips };
}

export async function getItems(lang: Locale = "es"): Promise<Item[]> {
  return (await getItemData(lang)).items;
}

function toItems(raw: RawItem[], es: RawItem[]): Item[] {
  const esById = new Map(es.map((i) => [i.id, i]));
  return raw.map((i) => ({
    id: i.id,
    className: i.class_name,
    name: i.name,
    image: i.shop_image_webp ?? i.shop_image ?? i.image_webp ?? i.image ?? "",
    type: i.type,
    slot: i.item_slot_type ?? null,
    tier: i.item_tier ?? null,
    cost: i.cost ?? null,
    quip: quipOf(esById.get(i.id)?.description) ?? quipOf(i.description),
    inShop: i.shopable !== false && i.disabled !== true,
  }));
}

function quipOf(d: { quip?: string } | string | null | undefined): string | null {
  return typeof d === "object" && d ? (d.quip ?? null) : null;
}

export async function getHeroDetail(heroId: number, lang: Locale = "es"): Promise<HeroDetail | null> {
  return (await getHeroDetails(lang))[heroId] ?? null;
}

/** Ficha de todos los héroes a la vez: los dos listados (~200 KB cada uno) se piden una vez, no una por héroe. */
async function getHeroDetails(lang: Locale): Promise<Record<number, HeroDetail>> {
  "use cache: remote";
  cacheLife("hours");
  type Pop = { item_id: number; pick_pct: number; winrate_pct: number }[];
  type Raw = {
    id: number;
    name: string;
    description?: { lore?: string; role?: string; playstyle?: string };
    tags?: string[];
    gun_tag?: string;
    hero_type?: string;
    complexity?: number;
    popular_items?: { early_game?: Pop; mid_game?: Pop; late_game?: Pop };
    images: Record<string, string | undefined>;
    items?: Record<string, string>;
    starting_stats?: Record<string, { value: number }>;
    colors?: { style_hex?: string };
  };
  // Los nombres se quedan como en el original; los textos descriptivos salen en el idioma pedido.
  const [all, es] = await Promise.all([
    get<Raw[]>("/v1/assets/heroes"),
    lang === "es" ? get<Raw[]>("/v1/assets/heroes?language=spanish").catch(() => [] as Raw[]) : Promise.resolve([] as Raw[]),
  ]);
  const esById = new Map(es.map((h) => [h.id, h]));
  const pop = (p?: Pop): PopularItem[] =>
    (p ?? []).map((x) => ({ itemId: x.item_id, pickRate: x.pick_pct / 100, winRate: x.winrate_pct / 100 }));
  const toDetail = (raw: Raw): HeroDetail => {
    const esRaw = esById.get(raw.id);
    const desc = esRaw?.description ?? raw.description;
    return {
      id: raw.id,
      name: raw.name,
      role: desc?.role ?? "",
      playstyle: desc?.playstyle ?? "",
      lore: desc?.lore ?? "",
      tags: esRaw?.tags ?? raw.tags ?? [],
      gunTag: esRaw?.gun_tag ?? raw.gun_tag ?? "",
      type: raw.hero_type ?? "",
      complexity: raw.complexity ?? 0,
      color: raw.colors?.style_hex ?? null,
      background: raw.images.background_image_webp ?? raw.images.background_image ?? "",
      stats: Object.entries(raw.starting_stats ?? {}).map(([key, v]) => ({ key, value: v.value })),
      abilityClasses: [1, 2, 3, 4].map((n) => raw.items?.[`signature${n}`]).filter((c): c is string => !!c),
      popular: {
        early: pop(raw.popular_items?.early_game),
        mid: pop(raw.popular_items?.mid_game),
        late: pop(raw.popular_items?.late_game),
      },
    };
  };
  return Object.fromEntries(all.map((h) => [h.id, toDetail(h)]));
}

/** Lo que necesita la pantalla de selección de héroes: retratos, fondo, etiquetas e iconos de habilidades. */
export type HeroShowcase = {
  id: number;
  name: string;
  vertical: string;
  card: string;
  /** La tarjeta en pose desafiante (misma medida que `card`), o "" si no existe. */
  gloat: string;
  background: string;
  nameImage: string;
  /** Busto de 512×512 con fondo transparente, o la tarjeta (280×380) si el héroe no lo tiene. */
  portrait: { src: string; size: "bust" | "card" };
  color: string;
  tags: string[];
  abilities: { name: string; image: string; tip: AbilityTip | null }[];
};

/* ---------- Ficha de habilidad (tooltip) ---------- */

/** Fragmento de la descripción: texto con una clase de énfasis, un salto de línea o el icono de ratón. */
export type AbilityRun = { t: string; c?: "highlight" | "diminish" | "spirit" | "stun" | "attr" } | { br: true } | { icon: "mouse" };

export type AbilityStat = {
  value: string;
  label: string;
  /** Escalado, p. ej. "1,6" con tipo "spirit" (poder espiritual) o "boons" (mejoras de nivel). */
  scale?: { n: string; kind: "spirit" | "boons" };
};

export type AbilityTip = {
  name: string;
  ultimate: boolean;
  cooldown: string | null;
  range: string | null;
  description: AbilityRun[];
  key: (AbilityStat & { tone: "spirit" | "health" | "neutral" })[];
  basic: AbilityStat[];
  tiers: { cost: number; text: string }[];
};

type RawProp = {
  value?: string | number;
  prefix?: string;
  postfix?: string;
  label?: string;
  postvalue_label?: string;
  css_class?: string;
  scale_function?: { class_name?: string; stat_scale?: number; specific_stat_scale_type?: string };
};

type RawAbility = {
  type: string;
  class_name: string;
  name: string;
  ability_type?: string;
  properties?: Record<string, RawProp>;
  description?: Record<string, string | undefined>;
  tooltip_details?: {
    info_sections?: {
      loc_string?: string;
      basic_properties?: string[];
      properties_block?: {
        properties?: {
          important_property?: string;
          status_effect_name?: string;
          status_effect_value?: string;
        }[];
      }[];
    }[];
  };
  upgrades?: { property_upgrades?: { name: string; bonus: string }[] }[];
};

const NUMBER_FORMATS: Record<Locale, Intl.NumberFormat> = {
  es: new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
};
/** Formato numérico de las fichas de habilidad; se fija antes de convertirlas (síncrono, sin esperas entre medias). */
let NF = NUMBER_FORMATS.es;
const TIER_COST = [1, 2, 5];

function propValue(p: RawProp | undefined): { n: number; text: string } | null {
  if (!p) return null;
  const n = parseFloat(String(p.value));
  if (!Number.isFinite(n)) return null;
  return { n, text: `${p.prefix === "-" ? "-" : ""}${NF.format(n)}${p.postfix ?? ""}` };
}

function statOf(p: RawProp | undefined): AbilityStat | null {
  const v = propValue(p);
  if (!v || v.n === 0 || !p) return null;
  const label = p.postvalue_label ?? p.label;
  if (!label) return null;
  const sf = p.scale_function;
  const scale =
    sf?.stat_scale && sf.stat_scale !== 1
      ? {
          n: NF.format(sf.stat_scale),
          kind: sf.specific_stat_scale_type === "ELevelUpBoons" ? ("boons" as const) : ("spirit" as const),
        }
      : undefined;
  return { value: v.text, label, scale };
}

/** Convierte el HTML del juego (spans de énfasis, <br>, SVG) en fragmentos que React pinta sin innerHTML. */
function parseDescription(html: string): AbilityRun[] {
  const clean = html
    .replace(/\(\s*<svg[\s\S]*?<\/svg>\s*\)/g, "(\u0001)")
    .replace(/<svg[\s\S]*?<\/svg>/g, "");
  const runs: AbilityRun[] = [];
  const stack: string[] = [];
  const classOf = (s: string): Extract<AbilityRun, { t: string }>["c"] => {
    if (/SpiritDamage/.test(s)) return "spirit";
    if (/Stun/.test(s)) return "stun";
    if (/inline-attribute-label/.test(s)) return "attr";
    if (/highlight/.test(s)) return "highlight";
    if (/diminish/.test(s)) return "diminish";
    return undefined;
  };
  for (const m of clean.matchAll(/<br\s*\/?>|<span class="([^"]*)">|<\/span>|<[^>]+>|[^<]+/g)) {
    const tok = m[0];
    if (/^<br/.test(tok)) runs.push({ br: true });
    else if (tok.startsWith("<span")) stack.push(m[1] ?? "");
    else if (tok === "</span>") stack.pop();
    else if (tok.startsWith("<")) continue;
    else {
      // El último span abierto con una clase conocida manda; el resto hereda de fuera.
      const c = [...stack].reverse().map(classOf).find(Boolean);
      for (const [i, part] of tok.split("\u0001").entries()) {
        if (i > 0) runs.push({ icon: "mouse" });
        const t = part.replace(/\s+/g, " ");
        if (t.trim() || t === " ") runs.push({ t, c });
      }
    }
  }
  return runs;
}

function toTip(a: RawAbility): AbilityTip {
  const props = a.properties ?? {};
  const cd = propValue(props.AbilityCooldown);
  const rg = propValue(props.AbilityCastRange);
  const description: AbilityRun[] = [];
  const key: AbilityTip["key"] = [];
  const basic: AbilityStat[] = [];
  for (const sec of a.tooltip_details?.info_sections ?? []) {
    if (sec.loc_string) {
      if (description.length) description.push({ br: true }, { br: true });
      description.push(...parseDescription(sec.loc_string));
    }
    for (const block of sec.properties_block ?? []) {
      for (const ip of block.properties ?? []) {
        if (ip.status_effect_name && ip.status_effect_value) {
          const sub = statOf(props[ip.status_effect_value]);
          if (sub) key.push({ value: ip.status_effect_name, label: `${sub.value} ${sub.label}`, tone: "neutral" });
          continue;
        }
        const p = ip.important_property ? props[ip.important_property] : undefined;
        const s = statOf(p);
        if (!s || !p) continue;
        const tone = p.css_class === "health" ? "health" : /Damage|DPS/.test(ip.important_property ?? "") ? "spirit" : "neutral";
        key.push({ ...s, tone });
      }
    }
    for (const name of sec.basic_properties ?? []) {
      const s = statOf(props[name]);
      if (s && !basic.some((b) => b.label === s.label)) basic.push(s);
    }
  }
  const tiers = (a.upgrades ?? []).slice(0, 3).flatMap((u, i) => {
    const given = a.description?.[`t${i + 1}_desc`]?.replace(/<[^>]+>/g, "").trim();
    const text =
      given ||
      (u.property_upgrades ?? [])
        .map((pu) => {
          const p = props[pu.name];
          const n = parseFloat(pu.bonus);
          if (!p || !Number.isFinite(n)) return null;
          return `${n < 0 ? "-" : "+"}${NF.format(Math.abs(n))}${p.postfix ?? ""} ${p.postvalue_label ?? p.label ?? ""}`.trim();
        })
        .filter(Boolean)
        .join(" y ");
    return text ? [{ cost: TIER_COST[i], text }] : [];
  });
  return {
    name: a.name,
    ultimate: a.ability_type === "ultimate",
    cooldown: cd && cd.n > 0 ? cd.text : null,
    range: rg && rg.n > 0 ? rg.text : null,
    description,
    key,
    basic,
    tiers,
  };
}

/** Fichas de todas las habilidades en el idioma pedido, por class_name del objeto. */
export async function getAbilityTips(lang: Locale = "es"): Promise<Record<string, AbilityTip>> {
  return (await getItemData(lang)).tips;
}

export async function getHeroShowcase(lang: Locale = "es"): Promise<HeroShowcase[]> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = {
    id: number;
    name: string;
    tags?: string[];
    images: Record<string, string | undefined>;
    items?: Record<string, string>;
    colors?: { style_hex?: string };
  };
  const [all, es, items, tips] = await Promise.all([
    get<Raw[]>("/v1/assets/heroes"),
    lang === "es" ? get<Raw[]>("/v1/assets/heroes?language=spanish").catch(() => [] as Raw[]) : Promise.resolve([] as Raw[]),
    getItems(lang).catch(() => [] as Item[]),
    getAbilityTips(lang).catch(() => ({}) as Record<string, AbilityTip>),
  ]);
  const esById = new Map(es.map((h) => [h.id, h]));
  const itemByClass = new Map(items.map((i) => [i.className, i]));
  const busts = await getHeroBusts(all.map((h) => h.images.icon_hero_card ?? "")).catch(() => all.map(() => null));
  return all.map((h, i) => {
    const img = (k: string) => h.images[`${k}_webp`] ?? h.images[k] ?? "";
    return {
      id: h.id,
      name: h.name,
      vertical: img("top_bar_vertical_image"),
      card: img("icon_hero_card"),
      gloat: img("hero_card_gloat"),
      background: img("background_image"),
      nameImage: h.images.name_image ?? "",
      portrait: busts[i] ? { src: busts[i], size: "bust" } : { src: img("icon_hero_card"), size: "card" },
      color: h.colors?.style_hex ?? "#c4954a",
      tags: esById.get(h.id)?.tags ?? h.tags ?? [],
      abilities: [1, 2, 3, 4]
        .map((n) => itemByClass.get(h.items?.[`signature${n}`] ?? ""))
        .filter((i): i is Item => !!i?.image)
        .map((i) => ({ name: i.name, image: i.image, tip: tips[i.className] ?? null })),
    };
  });
}

/**
 * El busto no viene en el listado de héroes: se deduce del nombre de la tarjeta
 * (inferno_card.png → inferno.webp) y solo se usa si existe; los héroes recientes no lo tienen.
 * Comprobarlo cuesta una petición por héroe, así que el resultado se guarda días (cambia solo si cambian las tarjetas).
 */
async function getHeroBusts(cards: string[]): Promise<(string | null)[]> {
  "use cache: remote";
  cacheLife("days");
  return Promise.all(
    cards.map(async (card) => {
      const url = card.replace(/_card\.png$/, ".webp");
      if (!url || url === card) return null;
      // Un fallo de red se propaga (y no se guarda): solo un 404 cuenta como "no hay busto".
      const ok = (await fetch(url, { method: "HEAD" })).ok;
      return ok ? url : null;
    }),
  );
}

/** Builds de la comunidad más populares esta semana (última versión de cada una). */
export async function getHeroBuilds(heroId: number, limit = 3): Promise<HeroBuild[]> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = {
    num_favorites: number | null;
    num_weekly_favorites: number | null;
    hero_build: {
      hero_build_id: number;
      name: string;
      description: string | null;
      details: {
        mod_categories: { name: string; description: string | null; mods: { ability_id: number }[] }[];
      };
    };
  };
  const raw = await get<Raw[]>(
    `/v1/builds?hero_id=${heroId}&sort_by=weekly_favorites&only_latest=true&build_language=English&limit=${limit}`,
  );
  return raw.map((b) => ({
    id: b.hero_build.hero_build_id,
    name: b.hero_build.name,
    description: b.hero_build.description ?? "",
    favorites: b.num_weekly_favorites ?? b.num_favorites ?? 0,
    categories: b.hero_build.details.mod_categories.map((c) => ({
      name: c.name,
      description: c.description ?? "",
      itemIds: c.mods.map((m) => m.ability_id),
    })),
  }));
}

/* ---------- Builds: rendimiento por héroe y rango ---------- */

export type BuildStat = {
  buildId: number;
  heroId: number;
  matches: number;
  wins: number;
  players: number;
  winRate: number;
};

export type BuildItem = { itemId: number; annotation: string };
export type BuildSection = { name: string; description: string; optional: boolean; items: BuildItem[] };
export type BuildDetail = {
  id: number;
  heroId: number;
  authorId: number;
  name: string;
  description: string;
  version: number;
  updated: number;
  sections: BuildSection[];
};

export type BuildItemStat = { itemId: number; matches: number; wins: number; avgBuyTime: number | null };

/** Inicio de la ventana de 7 días, redondeado a la hora para que la caché de la API lo reutilice. */
function weekAgo(): number {
  const hour = 3_600;
  return Math.floor(Date.now() / 1000 / hour) * hour - 7 * 86_400;
}

/** Filtro por rango medio de la partida: badge = rango × 10 + subrango (1–6). */
function badgeRange(tier: number | null): string {
  return tier === null ? "" : `&min_average_badge=${tier * 10 + 1}&max_average_badge=${tier * 10 + 6}`;
}

/** Builds más jugadas en los últimos 7 días, opcionalmente de un héroe y un rango. */
export async function getBuildStats(
  heroId: number | null,
  tier: number | null,
): Promise<{ builds: BuildStat[]; since: number }> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = { hero_id: number; hero_build_id: number; wins: number; matches: number; players: number };
  const since = weekAgo();
  // Con un héroe entran todas las builds. Sin héroe, la respuesta completa pesa ~10 MB y tarda segundos:
  // solo se muestran las más jugadas, así que se piden las que pasan de unas pocas partidas.
  const filter = heroId === null ? `&min_matches=${tier === null ? 100 : 10}` : `&hero_ids=${heroId}&min_matches=1`;
  const raw = await get<Raw[]>(
    `/v1/analytics/hero-build-stats?min_unix_timestamp=${since}${filter}${badgeRange(tier)}`,
  );
  const builds = raw
    .filter((r) => r.matches > 0)
    .map((r) => ({
      buildId: r.hero_build_id,
      heroId: r.hero_id,
      matches: r.matches,
      wins: r.wins,
      players: r.players,
      winRate: r.wins / r.matches,
    }))
    .sort((a, b) => b.matches - a.matches);
  return { builds, since };
}

/** Última versión publicada de una build. */
export async function getBuild(buildId: number): Promise<BuildDetail | null> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = {
    hero_build: {
      hero_id: number;
      hero_build_id: number;
      author_account_id: number;
      last_updated_timestamp: number;
      name: string;
      description: string | null;
      version: number;
      details: {
        mod_categories: {
          name: string | null;
          description: string | null;
          optional: boolean | null;
          mods: { ability_id: number; annotation: string | null }[];
        }[];
      };
    };
  };
  const raw = await get<Raw[]>(`/v1/builds?build_id=${buildId}&only_latest=true`);
  const b = raw[0]?.hero_build;
  if (!b) return null;
  return {
    id: b.hero_build_id,
    heroId: b.hero_id,
    authorId: b.author_account_id,
    name: b.name,
    description: b.description ?? "",
    version: b.version,
    updated: b.last_updated_timestamp,
    sections: b.details.mod_categories
      .filter((c) => c.mods.length > 0)
      .map((c) => ({
        name: sectionName(c.name ?? ""),
        description: c.description ?? "",
        optional: c.optional ?? false,
        items: c.mods.map((m) => ({ itemId: m.ability_id, annotation: m.annotation ?? "" })),
      })),
  };
}

/**
 * Varias builds a la vez (la API no admite pedirlas por lotes). Las peticiones van en tandas para no
 * pasar del límite de la API (100 peticiones/s): 250 de golpe acababan en errores y builds sin detalle.
 * Las que fallan simplemente no aparecen en el resultado.
 */
export async function getBuilds(buildIds: number[], concurrency = 32): Promise<Map<number, BuildDetail>> {
  const ids = [...new Set(buildIds)];
  const found: (BuildDetail | null)[] = new Array(ids.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const i = next++;
      found[i] = await safe(getBuild(ids[i]));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  // El orden del resultado sigue al de la entrada, no al de llegada: lo que se derive de él
  // (p. ej. la lista de autores) se usa como clave de caché y tiene que ser estable.
  return new Map(found.filter((d): d is BuildDetail => d !== null).map((d) => [d.id, d]));
}

/** Las secciones por defecto llegan como claves del juego: "#Citadel_HeroBuilds_LateGame" → "Late Game". */
const SECTION_ES: Record<string, string> = {
  "early game": "Inicio",
  "mid game": "Mitad",
  "late game": "Final",
  "flex slots": "Objetos flexibles",
};

function sectionName(name: string): string {
  const clean = sectionNameRaw(name);
  return SECTION_ES[clean.toLowerCase()] ?? clean;
}

function sectionNameRaw(name: string): string {
  if (!name.startsWith("#")) return name;
  return name
    .replace(/^#Citadel_HeroBuilds_/i, "")
    .replace(/^#/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

/** Objetos comprados por quienes jugaron con una build (mismos 7 días y rango). */
export async function getBuildItemStats(buildId: number, tier: number | null): Promise<BuildItemStat[]> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = { item_id: number; matches: number; wins: number; avg_buy_time_s: number | null };
  const raw = await get<Raw[]>(
    `/v1/analytics/item-stats?hero_build_id=${buildId}&min_unix_timestamp=${weekAgo()}${badgeRange(tier)}`,
  );
  return raw.map((r) => ({
    itemId: r.item_id,
    matches: r.matches,
    wins: r.wins,
    avgBuyTime: r.avg_buy_time_s ?? null,
  }));
}

/* ---------- Jugadores ---------- */

type RawSteam = {
  account_id: number;
  personaname: string;
  profileurl: string;
  avatarmedium: string;
  avatarfull: string;
  countrycode: string | null;
  matches_played_last_30d?: number | null;
};

const toProfile = (s: RawSteam): SteamProfile => ({
  accountId: s.account_id,
  name: s.personaname,
  avatar: s.avatarmedium,
  avatarFull: s.avatarfull,
  profileUrl: s.profileurl,
  country: s.countrycode,
  matchesLast30d: s.matches_played_last_30d ?? null,
});

/** Búsqueda sin filtrar: solo para el panel de administración. */
export async function searchPlayersRaw(query: string): Promise<SteamProfile[]> {
  "use cache";
  cacheLife("minutes");
  const raw = await get<RawSteam[]>(
    `/v1/players/steam-search?search_query=${encodeURIComponent(query)}&limit=24`,
  );
  return raw.map(toProfile);
}

export async function searchPlayers(query: string): Promise<SteamProfile[]> {
  const [list, blocked] = await Promise.all([searchPlayersRaw(query), getBlockedSet()]);
  return list.filter((p) => !blocked.has(p.accountId));
}

/** Rango actual de varias cuentas a la vez (las que no tienen partidas clasificatorias, o están bloqueadas, no aparecen). */
export async function getPlayerRanks(accountIds: number[]): Promise<Record<number, PlayerRank>> {
  const blocked = await getBlockedSet();
  const allowed = accountIds.filter((id) => !blocked.has(id));
  return allowed.length === 0 ? {} : fetchPlayerRanks(allowed);
}

async function fetchPlayerRanks(accountIds: number[]): Promise<Record<number, PlayerRank>> {
  "use cache: remote";
  cacheLife("hours");
  const ids = [...new Set(accountIds)].sort((a, b) => a - b);
  if (ids.length === 0) return {};
  const raw = await get<{ account_id: number; badge: number; rank: number; subrank: number }[]>(
    `/v1/players/rank?account_ids=${ids.join(",")}`,
  );
  return Object.fromEntries(
    raw.filter((r) => r.badge > 0).map((r) => [r.account_id, { badge: r.badge, tier: r.rank, subrank: r.subrank }]),
  );
}

/** Nombres de Steam de varias cuentas a la vez (las que no se conocen no aparecen). */
async function fetchPlayerNames(accountIds: number[]): Promise<Record<number, string>> {
  "use cache: remote";
  cacheLife("hours");
  const ids = [...new Set(accountIds)].sort((a, b) => a - b);
  if (ids.length === 0) return {};
  const raw = await get<RawSteam[]>(`/v1/players/steam?account_ids=${ids.join(",")}`);
  return Object.fromEntries(raw.map((s) => [s.account_id, s.personaname]));
}

export async function getPlayerNames(accountIds: number[]): Promise<Record<number, string>> {
  const [names, blocked] = await Promise.all([fetchPlayerNames(accountIds), getBlockedSet()]);
  return Object.fromEntries(Object.entries(names).filter(([id]) => !blocked.has(Number(id))));
}

export type PlayerMate = { accountId: number; matches: number; wins: number };

/** Compañeros de equipo con los que más partidas ha jugado (de todos los modos), de más a menos. */
async function fetchPlayerMates(accountId: number, limit: number): Promise<PlayerMate[]> {
  "use cache";
  cacheLife("minutes");
  const raw = await get<{ mate_id: number; wins: number; matches_played: number }[]>(
    `/v1/players/${accountId}/mate-stats`,
  );
  return raw
    .filter((r) => r.mate_id !== accountId)
    .map((r) => ({ accountId: r.mate_id, matches: r.matches_played, wins: r.wins }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, limit);
}

export async function getPlayerMates(accountId: number, limit = 6): Promise<PlayerMate[]> {
  const [mates, blocked] = await Promise.all([fetchPlayerMates(accountId, 100), getBlockedSet()]);
  return mates.filter((m) => !blocked.has(m.accountId)).slice(0, limit);
}

/** Perfiles de Steam de varias cuentas a la vez (las que no se conocen no aparecen). */
/** Perfiles sin filtrar: solo para el panel de administración. */
export async function getSteamProfilesRaw(accountIds: number[]): Promise<Record<number, SteamProfile>> {
  "use cache";
  cacheLife("hours");
  const ids = [...new Set(accountIds)].sort((a, b) => a - b);
  if (ids.length === 0) return {};
  const raw = await get<RawSteam[]>(`/v1/players/steam?account_ids=${ids.join(",")}`);
  return Object.fromEntries(raw.map((s) => [s.account_id, toProfile(s)]));
}

export async function getSteamProfiles(accountIds: number[]): Promise<Record<number, SteamProfile>> {
  const [profiles, blocked] = await Promise.all([getSteamProfilesRaw(accountIds), getBlockedSet()]);
  return Object.fromEntries(Object.entries(profiles).filter(([id]) => !blocked.has(Number(id))));
}

/** Sin comprobar la lista de bloqueo: usar getSteamProfile. */
async function getSteamProfileCached(accountId: number): Promise<SteamProfile | null> {
  "use cache";
  cacheLife("hours");
  const raw = await get<RawSteam[]>(`/v1/players/steam?account_ids=${accountId}`);
  return raw[0] ? toProfile(raw[0]) : null;
}

export async function getSteamProfile(accountId: number): Promise<SteamProfile | null> {
  return (await getBlockedSet()).has(accountId) ? null : getSteamProfileCached(accountId);
}

/** Sin comprobar la lista de bloqueo: usar getPlayerRank. */
async function getPlayerRankCached(accountId: number): Promise<PlayerRank | null> {
  "use cache";
  cacheLife("minutes");
  const raw = await get<{ badge: number; rank: number; subrank: number }>(`/v1/players/${accountId}/rank`);
  return raw.badge > 0 ? { badge: raw.badge, tier: raw.rank, subrank: raw.subrank } : null;
}

export async function getPlayerRank(accountId: number): Promise<PlayerRank | null> {
  return (await getBlockedSet()).has(accountId) ? null : getPlayerRankCached(accountId);
}

export type RankBin = { badge: number; tier: number; subrank: number; players: number };

/** Cuántos jugadores hay en cada subrango (badge = rango × 10 + subrango), de menor a mayor. */
export async function getRankDistribution(): Promise<RankBin[]> {
  "use cache: remote";
  cacheLife("hours");
  const raw = await get<{ badge: number; rank: number; subrank: number; players: number }[]>(
    "/v1/players/rank/distribution",
  );
  return raw
    .filter((r) => r.badge > 0)
    .map((r) => ({ badge: r.badge, tier: r.rank, subrank: r.subrank, players: r.players }))
    .sort((a, b) => a.badge - b.badge);
}

export type LeaderboardSpot = { region: Region; rank: number; /** Nombre de la entrada, para confirmar que es el mismo jugador. */ name: string };

/**
 * Puesto en las clasificaciones regionales de cada cuenta que aparece como candidata en alguna entrada.
 * Las entradas traen varios IDs posibles, no uno confirmado: quien use esto debe comprobar también el nombre.
 */
async function fetchLeaderboardIndex(): Promise<Record<number, LeaderboardSpot>> {
  "use cache: remote";
  cacheLife("hours");
  // Reutiliza la caché de cada clasificación regional (la misma que usan la portada y el tracker).
  const regions = Object.keys(REGIONS) as Region[];
  const results = await Promise.allSettled(regions.map((r) => getLeaderboardAll(r)));
  if (results.every((r) => r.status === "rejected")) throw new Error("Clasificaciones no disponibles");
  const out: Record<number, LeaderboardSpot> = {};
  results.forEach((res, i) => {
    if (res.status !== "fulfilled") return;
    for (const e of res.value) {
      for (const id of e.accountIds) {
        if (!out[id] || e.rank < out[id].rank) out[id] = { region: regions[i], rank: e.rank, name: e.name };
      }
    }
  });
  return out;
}

export async function getLeaderboardIndex(): Promise<Record<number, LeaderboardSpot>> {
  const [index, blocked] = await Promise.all([fetchLeaderboardIndex(), getBlockedSet()]);
  return Object.fromEntries(Object.entries(index).filter(([id]) => !blocked.has(Number(id))));
}

/** Sin comprobar la lista de bloqueo: usar getMatchHistory. */
async function getMatchHistoryCached(accountId: number): Promise<MatchRow[]> {
  "use cache";
  cacheLife("minutes");
  type Raw = {
    match_id: number;
    hero_id: number;
    start_time: number;
    match_duration_s: number;
    player_team: number;
    match_result: number;
    player_kills: number;
    player_deaths: number;
    player_assists: number;
    net_worth: number;
    last_hits: number;
    match_mode: number;
    abandoned_time_s: number | null;
  };
  const raw = await get<Raw[]>(`/v1/players/${accountId}/match-history`);
  return raw.map((m) => ({
    matchId: m.match_id,
    heroId: m.hero_id,
    start: m.start_time,
    duration: m.match_duration_s,
    won: m.player_team === m.match_result,
    kills: m.player_kills,
    deaths: m.player_deaths,
    assists: m.player_assists,
    netWorth: m.net_worth,
    lastHits: m.last_hits,
    ranked: m.match_mode === 4,
    abandoned: (m.abandoned_time_s ?? 0) > 0,
  }));
}

export async function getMatchHistory(accountId: number): Promise<MatchRow[]> {
  return (await getBlockedSet()).has(accountId) ? [] : getMatchHistoryCached(accountId);
}

/** Sin comprobar la lista de bloqueo: usar getPlayerHeroStats. */
async function getPlayerHeroStatsCached(accountId: number): Promise<PlayerHeroStat[]> {
  "use cache";
  cacheLife("minutes");
  type Raw = {
    hero_id: number;
    matches_played: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    networth_per_min: number;
    last_played: number;
  };
  const raw = await get<Raw[]>(`/v1/players/hero-stats?account_ids=${accountId}`);
  return raw
    .map((r) => ({
      heroId: r.hero_id,
      matches: r.matches_played,
      wins: r.wins,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      networthPerMin: r.networth_per_min,
      lastPlayed: r.last_played,
    }))
    .sort((a, b) => b.matches - a.matches);
}

export async function getPlayerHeroStats(accountId: number): Promise<PlayerHeroStat[]> {
  return (await getBlockedSet()).has(accountId) ? [] : getPlayerHeroStatsCached(accountId);
}

/** Ejecuta una petición y devuelve null si la API falla, para que una sección caída no tumbe la página. */
export async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

/* ---------- Detalle de objeto ---------- */

export type ItemProperty = { label: string; value: string };

export type ItemInfo = {
  /** Texto del objeto con <span class="highlight"> para los números clave (solo ese marcado). */
  description: string;
  active: boolean;
  cooldown: string | null;
  properties: ItemProperty[];
};

/** Qué hace un objeto: descripción en el idioma pedido y sus propiedades numéricas relevantes. */
export async function getItemInfo(itemId: number, lang: Locale = "es"): Promise<ItemInfo | null> {
  "use cache: remote";
  cacheLife("days");
  type Prop = { value?: string | number; label?: string; postfix?: string; prefix?: string; postvalue_label?: string };
  type Section = {
    section_type?: string;
    section_attributes?: {
      properties?: string[];
      important_properties?: string[];
      elevated_properties?: string[];
    }[];
  };
  type Raw = {
    description?: { desc?: string; active?: string; passive?: string } | string | null;
    is_active_item?: boolean;
    properties?: Record<string, Prop>;
    tooltip_sections?: Section[];
  };
  let raw: Raw;
  try {
    raw = await get<Raw>(`/v1/assets/items/${itemId}${langParam(lang)}`);
  } catch {
    return null;
  }
  const d = typeof raw.description === "object" && raw.description ? raw.description : {};
  const description = [d.desc, d.active, d.passive].filter(Boolean).join("\n");
  const props = raw.properties ?? {};
  const names: string[] = [];
  for (const s of raw.tooltip_sections ?? []) {
    for (const a of s.section_attributes ?? []) {
      for (const n of [...(a.elevated_properties ?? []), ...(a.important_properties ?? []), ...(a.properties ?? [])]) {
        if (!names.includes(n)) names.push(n);
      }
    }
  }
  const show = (n: string): ItemProperty | null => {
    const p = props[n];
    const v = p?.value === undefined ? "" : String(p.value).trim();
    if (!p?.label || v === "" || v === "0" || v === "-1" || v === "-1.0") return null;
    const post = (p.postfix ?? "").trim();
    const sign = p.postvalue_label?.includes("{s:sign}") && !v.startsWith("-") && !v.startsWith("+") ? "+" : "";
    const unit = post && !v.endsWith(post) ? (post === "%" ? " %" : ` ${post}`) : "";
    return { label: p.label, value: `${sign}${v}${unit}` };
  };
  const cooldown = show("AbilityCooldown");
  const properties = (names.length ? names : Object.keys(props))
    .filter((n) => n !== "AbilityCooldown")
    .map(show)
    .filter((p): p is ItemProperty => p !== null)
    .slice(0, 12);
  return {
    description,
    active: raw.is_active_item ?? false,
    cooldown: cooldown?.value ?? null,
    properties,
  };
}

export type ItemBuyStat = { matches: number; winRate: number; avgBuyTime: number; avgBuyRelative: number };

type RawItemStat = {
  item_id: number;
  bucket: number;
  wins: number;
  matches: number;
  avg_buy_time_s: number;
  avg_buy_time_relative: number;
};

/** Ventana de 30 días, la misma que usan las estadísticas de héroes. */
function monthAgo(): number {
  const day = 86_400;
  return Math.floor(Date.now() / 1000 / day) * day - 30 * day;
}

/** Cuándo y cuánto se compra cada objeto (partidas normales, 30 días). */
export async function getItemBuyStats(): Promise<Record<number, ItemBuyStat>> {
  "use cache: remote";
  cacheLife("hours");
  const raw = await get<RawItemStat[]>(
    `/v1/analytics/item-stats?game_mode=normal&min_unix_timestamp=${monthAgo()}&min_matches=50`,
  );
  return Object.fromEntries(
    raw.map((r) => [
      r.item_id,
      {
        matches: r.matches,
        winRate: r.matches ? r.wins / r.matches : 0,
        avgBuyTime: r.avg_buy_time_s,
        avgBuyRelative: r.avg_buy_time_relative / 100,
      },
    ]),
  );
}

/** [heroId o enemyHeroId, partidas, victorias] por objeto. */
export type ItemHeroRow = [number, number, number];

async function itemBuckets(bucket: "hero" | "enemy_hero", days: number): Promise<Record<number, ItemHeroRow[]>> {
  const day = 86_400;
  const since = Math.floor(Date.now() / 1000 / day) * day - days * day;
  const path = `/v1/analytics/item-stats?bucket=${bucket}&game_mode=normal&min_unix_timestamp=${since}&min_matches=200`;
  // Estas consultas son pesadas y la API a veces devuelve 504: se reintenta antes de rendirse.
  let raw: RawItemStat[] | null = null;
  for (let attempt = 0; raw === null; attempt++) {
    try {
      raw = await get<RawItemStat[]>(path);
    } catch (e) {
      if (attempt >= 2) throw e;
    }
  }
  const out: Record<number, ItemHeroRow[]> = {};
  for (const r of raw) (out[r.item_id] ??= []).push([r.bucket, r.matches, r.wins]);
  return out;
}

/** Quién compra cada objeto y con qué resultado, por héroe propio. */
export async function getItemsByHero(): Promise<Record<number, ItemHeroRow[]>> {
  "use cache: remote";
  cacheLife("hours");
  return itemBuckets("hero", 30);
}

/** Cómo rinde cada objeto según el héroe enemigo al que se enfrenta (últimos 7 días: la consulta es pesada). */
export async function getItemsByEnemy(): Promise<Record<number, ItemHeroRow[]>> {
  "use cache: remote";
  cacheLife("hours");
  return itemBuckets("enemy_hero", 7);
}

/* ---------- Detalle de partida ---------- */

export type MatchPlayer = {
  accountId: number;
  team: 0 | 1;
  heroId: number;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  lastHits: number;
  denies: number;
  /** Daño a héroes, curación propia y a aliados, daño recibido y daño a jefes/estructuras. */
  damage: number;
  healing: number;
  taken: number;
  bossDamage: number;
  /** Disparos acertados / disparos totales, o null si no hay datos. */
  accuracy: number | null;
  /** Objetos de mejora que llevaba al final (los vendidos no cuentan). */
  itemIds: number[];
  /** Almas en cada instantánea de la partida (misma cadencia para todos los jugadores). */
  series: number[];
};

export type MatchDetail = {
  matchId: number;
  start: number;
  duration: number;
  winner: 0 | 1;
  ranked: boolean;
  /** "Normal", "Street Brawl"…; null si el modo no se reconoce. */
  mode: string | null;
  /** Rango medio de cada equipo (badge = rango × 10 + subrango), si la partida lo informa. */
  badges: [number | null, number | null];
  /** Segundos de partida en los que se tomó cada instantánea de `series`. */
  times: number[];
  players: MatchPlayer[];
  banned: number[];
};

const GAME_MODE_LABEL: Record<number, string> = { 1: "Normal", 4: "Street Brawl" };

/** Resultado completo de una partida terminada. La API tarda en tener las más recientes: devuelve error si no está. */
async function fetchMatchDetail(matchId: number): Promise<MatchDetail> {
  "use cache: remote";
  cacheLife("hours");
  type Snap = {
    time_stamp_s: number;
    net_worth: number;
    player_damage?: number;
    player_healing?: number;
    player_damage_taken?: number;
    boss_damage?: number;
    shots_hit?: number;
    shots_missed?: number;
  };
  type RawPlayer = {
    account_id: number;
    team: number;
    hero_id: number;
    level: number;
    kills: number;
    deaths: number;
    assists: number;
    net_worth: number;
    last_hits: number;
    denies: number;
    stats?: Snap[];
    items?: { item_id: number; sold_time_s: number; game_time_s: number }[];
  };
  type Raw = {
    match_info: {
      match_id: number;
      start_time: number;
      duration_s: number;
      winning_team: number;
      game_mode: number;
      match_mode: number;
      average_badge_team0: number | null;
      average_badge_team1: number | null;
      players: RawPlayer[];
    };
    banned_hero_ids?: number[] | null;
  };
  const [raw, items] = await Promise.all([get<Raw>(`/v1/matches/${matchId}/metadata`), getItems()]);
  const info = raw.match_info;
  const upgrades = new Map(items.filter((i) => i.type === "upgrade").map((i) => [i.id, i]));
  const players: MatchPlayer[] = info.players.map((p) => {
    const snaps = p.stats ?? [];
    const end = snaps[snaps.length - 1];
    const shots = (end?.shots_hit ?? 0) + (end?.shots_missed ?? 0);
    const kept = [...new Set((p.items ?? []).filter((i) => i.sold_time_s === 0).map((i) => i.item_id))]
      .map((id) => upgrades.get(id))
      .filter((i): i is Item => !!i)
      .sort((a, b) => (b.tier ?? 0) - (a.tier ?? 0) || (b.cost ?? 0) - (a.cost ?? 0));
    return {
      accountId: p.account_id,
      team: p.team === 1 ? 1 : 0,
      heroId: p.hero_id,
      level: p.level,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      netWorth: p.net_worth,
      lastHits: p.last_hits,
      denies: p.denies,
      damage: end?.player_damage ?? 0,
      healing: end?.player_healing ?? 0,
      taken: end?.player_damage_taken ?? 0,
      bossDamage: end?.boss_damage ?? 0,
      accuracy: shots > 0 ? (end?.shots_hit ?? 0) / shots : null,
      itemIds: kept.map((i) => i.id),
      series: snaps.map((s) => s.net_worth),
    };
  });
  const times = (info.players.find((p) => p.stats?.length)?.stats ?? []).map((s) => s.time_stamp_s);
  return {
    matchId: info.match_id,
    start: info.start_time,
    duration: info.duration_s,
    winner: info.winning_team === 1 ? 1 : 0,
    ranked: info.match_mode === 4,
    mode: GAME_MODE_LABEL[info.game_mode] ?? null,
    badges: [info.average_badge_team0 || null, info.average_badge_team1 || null],
    times,
    players,
    banned: raw.banned_hero_ids ?? [],
  };
}

export async function getMatchDetail(matchId: number): Promise<MatchDetail> {
  const [m, blocked] = await Promise.all([fetchMatchDetail(matchId), getBlockedSet()]);
  return { ...m, players: m.players.map((p, i) => (blocked.has(p.accountId) ? { ...p, accountId: hiddenId(i) } : p)) };
}

/* ---------- Enfrentamientos entre héroes ---------- */

export type Matchup = { heroId: number; matches: number; winRate: number };

/** Con qué héroes enemigos gana más y con cuáles pierde más un héroe (partidas normales, 30 días). */
export async function getHeroMatchups(heroId: number, limit = 5): Promise<{ strong: Matchup[]; weak: Matchup[] }> {
  const rows = (await getMatchupTable())[heroId] ?? [];
  return { strong: rows.slice(0, limit), weak: rows.slice(-limit).reverse() };
}

/** Cruces de cada héroe, de mejor a peor: la tabla (~200 KB) se pide una vez para todos los héroes. */
async function getMatchupTable(): Promise<Record<number, Matchup[]>> {
  "use cache: remote";
  cacheLife("hours");
  type Raw = { hero_id: number; enemy_hero_id: number; wins: number; matches_played: number };
  const raw = await get<Raw[]>(`/v1/analytics/hero-counter-stats?game_mode=normal&min_unix_timestamp=${monthAgo()}`);
  const out: Record<number, Matchup[]> = {};
  // Con pocas partidas el porcentaje no significa nada: se descartan los cruces poco jugados.
  for (const r of raw) {
    if (r.matches_played < 1000) continue;
    (out[r.hero_id] ??= []).push({ heroId: r.enemy_hero_id, matches: r.matches_played, winRate: r.wins / r.matches_played });
  }
  for (const rows of Object.values(out)) rows.sort((a, b) => b.winRate - a.winRate);
  return out;
}

/* ---------- Enfrentamiento: un héroe contra otro ---------- */

/** Medias por partida de un lado del enfrentamiento. */
export type DuelSide = {
  kills: number;
  deaths: number;
  assists: number;
  souls: number;
  objDamage: number;
  lastHits: number;
  denies: number;
};
export type Duel = { matches: number; winRate: number; a: DuelSide; b: DuelSide };

type RawCounter = {
  hero_id: number;
  enemy_hero_id: number;
  wins: number;
  matches_played: number;
  kills: number;
  enemy_kills: number;
  deaths: number;
  enemy_deaths: number;
  assists: number;
  enemy_assists: number;
  networth: number;
  enemy_networth: number;
  obj_damage: number;
  enemy_obj_damage: number;
  last_hits: number;
  enemy_last_hits: number;
  denies: number;
  enemy_denies: number;
};

/**
 * Todos los cruces de héroes en la partida completa (no solo en el mismo carril),
 * partidas normales de los últimos 30 días. Una sola consulta sirve para cualquier pareja.
 */
async function getCounterTable(): Promise<RawCounter[]> {
  "use cache: remote";
  cacheLife("hours");
  return get<RawCounter[]>(
    `/v1/analytics/hero-counter-stats?game_mode=normal&same_lane_filter=false&min_unix_timestamp=${monthAgo()}`,
  );
}

/** Cara a cara de `a` contra `b`, o null si no hay partidas entre ellos. */
export async function getDuel(a: number, b: number): Promise<Duel | null> {
  const r = (await getCounterTable()).find((x) => x.hero_id === a && x.enemy_hero_id === b);
  if (!r || r.matches_played === 0) return null;
  const n = r.matches_played;
  return {
    matches: n,
    winRate: r.wins / n,
    a: {
      kills: r.kills / n,
      deaths: r.deaths / n,
      assists: r.assists / n,
      souls: r.networth / n,
      objDamage: r.obj_damage / n,
      lastHits: r.last_hits / n,
      denies: r.denies / n,
    },
    b: {
      kills: r.enemy_kills / n,
      deaths: r.enemy_deaths / n,
      assists: r.enemy_assists / n,
      souls: r.enemy_networth / n,
      objDamage: r.enemy_obj_damage / n,
      lastHits: r.enemy_last_hits / n,
      denies: r.enemy_denies / n,
    },
  };
}

/** [partidas, victorias, minuto medio de compra en segundos] de un objeto. */
export type ItemRecord = { matches: number; wins: number; avgBuyTime: number };

function toRecords(raw: RawItemStat[]): Record<number, ItemRecord> {
  return Object.fromEntries(
    raw.map((r) => [r.item_id, { matches: r.matches, wins: r.wins, avgBuyTime: r.avg_buy_time_s }]),
  );
}

/** Cómo rinde cada objeto con un héroe en general (partidas normales, 30 días). */
export async function getHeroItemRecords(heroId: number): Promise<Record<number, ItemRecord>> {
  "use cache: remote";
  cacheLife("hours");
  return toRecords(
    await get<RawItemStat[]>(
      `/v1/analytics/item-stats?game_mode=normal&hero_id=${heroId}&min_unix_timestamp=${monthAgo()}&min_matches=20`,
    ),
  );
}

/** Cómo rinde cada objeto con el héroe `a` en partidas contra `b` (partidas normales, 30 días). */
export async function getMatchupItemRecords(a: number, b: number): Promise<Record<number, ItemRecord>> {
  "use cache: remote";
  cacheLife("hours");
  return toRecords(
    await get<RawItemStat[]>(
      `/v1/analytics/item-stats?game_mode=normal&hero_id=${a}&enemy_hero_ids=${b}&min_unix_timestamp=${monthAgo()}&min_matches=20`,
    ),
  );
}
