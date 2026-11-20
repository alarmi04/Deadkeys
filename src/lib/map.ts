import { cached } from "@/lib/cache";

const API = "https://api.deadlock-api.com";

/** Punto en coordenadas relativas del minimapa: u de izquierda a derecha, v de arriba abajo (0–1). */
export type Pt = { u: number; v: number };
export type Team = 0 | 1;

export type Lane = { lane: 0 | 1 | 2; color: string; name: string; path: string };
export type Buff = { label: string; icon: string };

/** Cifras del juego que publica la API (en segundos); null si la API no las devolvió. */
export type Timings = {
  buffFirst: number | null;
  buffEvery: number | null;
  buffs: Buff[];
  breakableFirst: number | null;
  rejuvDuration: number | null;
};

export type MapDetail = {
  images: { plate: string; midTunnels: string; ratTunnels: string };
  icons: {
    small: string;
    medium: string;
    large: string;
    vault: string;
    shop: string;
    boss: string;
    urn: string;
    teleporter: string;
  };
  timings: Timings;
  lanes: Lane[];
  midBoss: Pt;
  sentries: (Pt & { team: Team })[];
  shops: (Pt & { team: Team | null; kind: "lane" | "base" | "secret" })[];
  urnPads: Pt[];
  bridgeBuffs: Pt[];
  rifts: Pt[];
  camps: (Pt & { tier: "small" | "medium" | "large"; name: string })[];
  sinners: (Pt & { name: string })[];
  snacks: Pt[];
  teleporters: (Pt & { to: Pt })[];
  jumpPads: (Pt & { to: Pt })[];
  ropes: Pt[];
  vents: Pt[];
  veils: Pt[];
  statues: Pt[];
  crates: Pt[];
  toughCrates: Pt[];
};

type Vec = [number, number, number];
type RawPos = { position: Vec; left_relative: number; top_relative: number };
type RawMap = {
  radius: number;
  images: Record<string, string>;
  zipline_paths: { origin: Vec; color: string; P0_points: Vec[]; P1_points: Vec[]; P2_points: Vec[] }[];
  neutral_camps: (RawPos & { name: string; kind: string; icon: string })[];
  entities: {
    crates: RawPos[];
    tough_crates: RawPos[];
    golden_statues: RawPos[];
    healing_snacks: RawPos[];
    bridge_buffs: RawPos[];
    climb_ropes: RawPos[];
    teleporters: (RawPos & { target: Vec })[];
    shops: (RawPos & { team?: number; kind: string })[];
    soul_urn_pads: RawPos[];
    base_sentries: (RawPos & { team: number })[];
    bounce_pads: (RawPos & { target: Vec })[];
    steam_vents: RawPos[];
    cosmic_veils: RawPos[];
    unstable_rifts: RawPos[];
  };
};
type RawGeneric = {
  lane_info?: { lane_name: string; color?: { red: number; green: number; blue: number } }[];
  rejuv_params?: { rejuvinator_buff_duration?: number };
};
type RawMisc = {
  class_name: string;
  initial_spawn_time?: number;
  spawn_interval?: number;
  pickup_chances?: Record<string, number>;
}[];

const r4 = (n: number) => Math.round(n * 10_000) / 10_000;
const pt = (e: RawPos): Pt => ({ u: r4(e.left_relative), v: r4(e.top_relative) });

/** GET que devuelve null si falla: los datos extra no deben tumbar el mapa. */
async function getOptional<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const hexRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/** Nombre de la línea por el color de su tirolina; solo se usa si la API no da el nombre. */
function fallbackLaneName(hex: string): string {
  const [r, g, b] = hexRgb(hex);
  if (r > 200 && g > 160 && b < 120) return "amarilla";
  if (g > r && g > b) return "verde";
  if (b >= g && b > r) return "azul";
  return "sin nombre";
}

/** "nw_utility_south_neutrals" → "NW Utility South"; "plaza_pit_vault1" → "Plaza Pit". */
function prettyName(raw: string): string {
  const ACRONYMS = new Set(["hq", "nw", "sw", "ne", "se"]);
  return raw
    .replace(/_(camp|neutrals|vault\d*)$/, "")
    .split("_")
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : /^\d+$/.test(w) ? String(Number(w)) : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

const BUFF_LABELS: Record<string, { label: string; icon: string }> = {
  gun: { label: "Arma", icon: "powerup_weapon.svg" },
  survival: { label: "Supervivencia", icon: "powerup_health.svg" },
  casting: { label: "Lanzamiento", icon: "powerup_magic.svg" },
  movement: { label: "Movimiento", icon: "powerup_movement.svg" },
};

export const getMapDetail = cached("getMapDetail", "days", async (): Promise<MapDetail> => {
  const [raw, generic, misc, iconList] = await Promise.all([
    (async () => {
      const res = await fetch(`${API}/v1/assets/map`, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Deadlock API ${res.status} en /v1/assets/map`);
      return (await res.json()) as RawMap;
    })(),
    getOptional<RawGeneric>("/v1/assets/generic-data"),
    getOptional<RawMisc>("/v1/assets/misc-entities"),
    getOptional<{ minimap?: Record<string, string> }>("/v1/assets/icons"),
  ]);
  const R = raw.radius;
  // Coordenadas del juego → relativas; mismo cálculo que left_relative/top_relative de la API.
  const rel = (x: number, y: number): Pt => ({ u: r4((x + R) / (2 * R)), v: r4((R - y) / (2 * R)) });
  const S = (p: Pt) => `${Math.round(p.u * 10_000) / 10},${Math.round(p.v * 10_000) / 10}`;
  const e = raw.entities;
  const mm = iconList?.minimap ?? {};

  // Nombres de las líneas según el juego (York, Broadway, Greenwich), emparejados por color.
  const laneByColor = (hex: string) => {
    const [r, g, b] = hexRgb(hex);
    return generic?.lane_info?.find((l) => l.color && l.color.red === r && l.color.green === g && l.color.blue === b)?.lane_name;
  };

  // Cada tirolina es una curva de Bézier por tramos: P0 son los puntos y P1/P2 las tangentes de entrada y salida.
  const lanes = raw.zipline_paths
    .map((z) => {
      const at = (i: number, d?: Vec) => {
        const p = z.P0_points[i];
        return rel(z.origin[0] + p[0] + (d?.[0] ?? 0), z.origin[1] + p[1] + (d?.[1] ?? 0));
      };
      let d = `M${S(at(0))}`;
      for (let i = 0; i + 1 < z.P0_points.length; i++) {
        d += `C${S(at(i, z.P2_points[i]))} ${S(at(i + 1, z.P1_points[i + 1]))} ${S(at(i + 1))}`;
      }
      const meanU = z.P0_points.reduce((a, _, i) => a + at(i).u, 0) / z.P0_points.length;
      return { color: z.color, name: laneByColor(z.color) ?? fallbackLaneName(z.color), path: d, meanU };
    })
    .sort((a, b) => a.meanU - b.meanU)
    .map((l, i) => ({ color: l.color, name: l.name, path: l.path, lane: i as 0 | 1 | 2 }));

  const tier = { weak: "small", medium: "medium", strong: "large" } as const;
  const campIcon = (kind: string) => raw.neutral_camps.find((c) => c.kind === kind)?.icon ?? "";

  const misc1 = (cls: string) => misc?.find((m) => m.class_name === cls);
  const positive = (n: number | undefined) => (typeof n === "number" && n > 0 ? n : null);
  const powerup = misc1("citadel_item_powerup_spawner");
  const buffs: Buff[] = Object.entries(powerup?.pickup_chances ?? {})
    .filter(([, chance]) => chance > 0)
    .flatMap(([key]) => {
      const b = BUFF_LABELS[key.replace(/_powerup_pickup$/, "")];
      const icon = b && mm[b.icon];
      return b && icon ? [{ label: b.label, icon }] : [];
    });

  return {
    images: {
      plate: raw.images.mid ?? raw.images.minimap,
      midTunnels: raw.images.mid_tunnels ?? "",
      ratTunnels: raw.images.rat_tunnels ?? "",
    },
    icons: {
      small: campIcon("weak"),
      medium: campIcon("medium"),
      large: campIcon("strong"),
      vault: campIcon("vault"),
      shop: mm["minimap_shop_psd.png"] ?? "",
      boss: mm["boss_marker_neutral_psd.png"] ?? "",
      urn: mm["soul_jar_marker_psd.png"] ?? "",
      teleporter: mm["minimap_teleporter_highlight.svg"] ?? "",
    },
    timings: {
      buffFirst: positive(powerup?.initial_spawn_time),
      buffEvery: positive(powerup?.spawn_interval),
      buffs,
      breakableFirst: positive(misc1("citadel_breakable_prop_wooden_crate")?.initial_spawn_time),
      rejuvDuration: positive(generic?.rejuv_params?.rejuvinator_buff_duration),
    },
    lanes,
    midBoss: { u: 0.5, v: 0.5 },
    sentries: e.base_sentries.map((s) => ({ ...pt(s), team: (s.team === 1 ? 1 : 0) as Team })),
    shops: e.shops.map((s) => ({
      ...pt(s),
      team: s.team === 0 || s.team === 1 ? (s.team as Team) : null,
      kind: s.kind === "base" ? "base" : s.kind === "secret" ? "secret" : "lane",
    })),
    urnPads: e.soul_urn_pads.map(pt),
    bridgeBuffs: e.bridge_buffs.map(pt),
    rifts: e.unstable_rifts.map(pt),
    camps: raw.neutral_camps
      .filter((c) => c.kind in tier)
      .map((c) => ({ ...pt(c), tier: tier[c.kind as keyof typeof tier], name: prettyName(c.name) })),
    sinners: raw.neutral_camps.filter((c) => c.kind === "vault").map((c) => ({ ...pt(c), name: prettyName(c.name) })),
    snacks: e.healing_snacks.map(pt),
    teleporters: e.teleporters.map((t) => ({ ...pt(t), to: rel(t.target[0], t.target[1]) })),
    jumpPads: e.bounce_pads.map((t) => ({ ...pt(t), to: rel(t.target[0], t.target[1]) })),
    ropes: e.climb_ropes.map(pt),
    vents: e.steam_vents.map(pt),
    veils: e.cosmic_veils.map(pt),
    statues: e.golden_statues.map(pt),
    crates: e.crates.map(pt),
    toughCrates: e.tough_crates.map(pt),
  };
});
