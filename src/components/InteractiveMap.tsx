"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormat, useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import type { MapDetail, Pt } from "@/lib/map";

/* ---------- Capas ---------- */

type LayerId =
  | "sentries"
  | "midBoss"
  | "shops"
  | "urnPads"
  | "bridgeBuffs"
  | "camps"
  | "sinners"
  | "snacks"
  | "rifts"
  | "ziplines"
  | "teleporters"
  | "jumpPads"
  | "ropes"
  | "vents"
  | "veils"
  | "tunnelsMid"
  | "tunnelsRat"
  | "statues"
  | "crates"
  | "toughCrates";

const GROUPS: { id: string; layers: { id: LayerId; on: boolean }[] }[] = [
  {
    id: "objectives",
    layers: [
      { id: "midBoss", on: true },
      { id: "sentries", on: true },
    ],
  },
  {
    id: "economy",
    layers: [
      { id: "shops", on: true },
      { id: "urnPads", on: true },
      { id: "bridgeBuffs", on: true },
    ],
  },
  {
    id: "jungle",
    layers: [
      { id: "camps", on: true },
      { id: "sinners", on: true },
      { id: "snacks", on: false },
      { id: "rifts", on: true },
    ],
  },
  {
    id: "movement",
    layers: [
      { id: "ziplines", on: true },
      { id: "teleporters", on: true },
      { id: "jumpPads", on: true },
      { id: "ropes", on: false },
    ],
  },
  {
    id: "vision",
    layers: [
      { id: "vents", on: false },
      { id: "veils", on: false },
    ],
  },
  {
    id: "underground",
    layers: [
      { id: "tunnelsMid", on: false },
      { id: "tunnelsRat", on: false },
    ],
  },
  {
    id: "breakable",
    layers: [
      { id: "statues", on: false },
      { id: "crates", on: false },
      { id: "toughCrates", on: false },
    ],
  },
];

const DEFAULTS = Object.fromEntries(GROUPS.flatMap((g) => g.layers.map((l) => [l.id, l.on]))) as Record<
  LayerId,
  boolean
>;

const TEAM = ["Hidden King", "Archmother"] as const;
const TEAM_COLOR = ["var(--team-amber)", "var(--team-sapphire)"] as const;

const COLOR = {
  rift: "#c77dff",
  travel: "#7fd8f0",
  snack: "#4fd8b4",
  vent: "#b8c4cc",
  veil: "#b48ae6",
  statue: "#e8c15a",
  crate: "#b98552",
  tough: "#7dbb6a",
} as const;

/* ---------- Elementos del mapa ---------- */

type Item = Pt & {
  key: string;
  layer: LayerId;
  title: string;
  where?: string;
  detail: string;
  /** Datos de dibujo según la capa. */
  team?: 0 | 1 | null;
  tier?: "small" | "medium" | "large";
  secret?: boolean;
  to?: Pt;
  /** Iconos del juego que se muestran en la ficha (por ejemplo, los tipos de buff). */
  images?: { src: string; label: string }[];
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// El dibujo de los iconos de la API ocupa solo el centro de su lienzo: el tamaño es el del lienzo.
const CAMP = {
  small: { size: 36 },
  medium: { size: 42 },
  large: { size: 48 },
} as const;

function buildItems(d: MapDetail, t: Messages["map"]): Item[] {
  const items: Item[] = [];
  const T = d.timings;
  const x = t.items;
  const breakable = (what: string) => (T.breakableFirst ? x.breakableFrom(what, mmss(T.breakableFirst)) : what);

  const push = <P extends Pt>(layer: LayerId, list: P[], f: (p: P) => Omit<Item, "key" | "layer" | "u" | "v">) =>
    list.forEach((p, i) => items.push({ key: `${layer}-${i}`, layer, ...p, ...f(p) }));

  push("sentries", d.sentries, (s) => ({
    team: s.team,
    title: x.sentry.title,
    where: TEAM[s.team],
    detail: x.sentry.detail,
  }));
  items.push({
    key: "midBoss-0",
    layer: "midBoss",
    ...d.midBoss,
    title: "Mid Boss",
    where: x.midBoss.where,
    detail: T.rejuvDuration ? x.midBossRejuv(mmss(T.rejuvDuration)) : x.midBoss.detail,
  });
  push("shops", d.shops, (s) => ({
    team: s.team,
    secret: s.kind === "secret",
    title: s.kind === "secret" ? x.shopSecret : s.kind === "base" ? x.shopBase : x.shopLane,
    where: s.team === 0 || s.team === 1 ? TEAM[s.team] : x.bothTeams,
    detail: s.kind === "secret" ? x.shopSecretDetail : s.kind === "base" ? x.shopBaseDetail : x.shopLaneDetail,
  }));
  push("urnPads", d.urnPads, () => ({ title: x.urn.title, where: x.urn.where, detail: x.urn.detail }));
  push("bridgeBuffs", d.bridgeBuffs, () => ({
    title: x.bridgeBuff,
    detail:
      T.buffFirst && T.buffEvery ? x.bridgeBuffTimed(mmss(T.buffFirst), mmss(T.buffEvery)) : x.bridgeBuffDetail,
    images: T.buffs.map((b) => ({ src: b.icon, label: b.label })),
  }));
  push("camps", d.camps, (c) => ({
    tier: c.tier,
    title: x.camp(x.campSizes[c.tier]),
    where: c.name,
    detail: x.campDetail(x.campSizes[c.tier]),
  }));
  push("sinners", d.sinners, (s) => ({ title: "Sinner's Sacrifice", where: s.name, detail: x.sinnersDetail }));
  push("snacks", d.snacks, () => ({ title: x.snack.title, detail: x.snack.detail }));
  push("rifts", d.rifts, () => ({ title: x.rift.title, where: x.rift.where, detail: x.rift.detail }));
  push("teleporters", d.teleporters, (p) => ({
    to: p.to,
    title: x.teleporter.title,
    where: x.teleporter.where,
    detail: x.teleporter.detail,
  }));
  push("jumpPads", d.jumpPads, (p) => ({ to: p.to, title: x.jumpPad.title, detail: x.jumpPad.detail }));
  push("ropes", d.ropes, () => ({ title: x.rope.title, detail: x.rope.detail }));
  push("vents", d.vents, () => ({ title: x.vent.title, detail: x.vent.detail }));
  push("veils", d.veils, () => ({ title: x.veil.title, detail: x.veil.detail }));
  push("statues", d.statues, () => ({ title: x.statue.title, detail: breakable(x.statue.detail) }));
  push("crates", d.crates, () => ({ title: x.crate.title, detail: breakable(x.crate.detail) }));
  push("toughCrates", d.toughCrates, () => ({ title: x.toughCrate.title, detail: breakable(x.toughCrate.detail) }));
  return items;
}

/* ---------- Formas (en píxeles de pantalla; el grupo las escala) ---------- */

const diamond = (s: number) => `0,${-s} ${s},0 0,${s} ${-s},0`;
const hexagon = (s: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(Math.cos(a) * s).toFixed(2)},${(Math.sin(a) * s).toFixed(2)}`;
  }).join(" ");

function Glyph({ item, icons }: { item: Item; icons: MapDetail["icons"] }) {
  switch (item.layer) {
    case "sentries":
      return <polygon points="0,-6 5.5,4.5 -5.5,4.5" fill={TEAM_COLOR[item.team ?? 0]} stroke="var(--ox-deep)" strokeWidth={1.4} />;
    // Iconos del propio juego (los da la API); el aro de color queda aunque falte la imagen.
    case "midBoss":
      return (
        <>
          <circle r={15} fill="var(--ox-deep)" stroke="var(--vermilion)" strokeWidth={2} />
          {icons.boss && <image href={icons.boss} x={-11} y={-11} width={22} height={22} />}
        </>
      );
    case "shops":
      return (
        <>
          <circle r={12} fill="var(--ox-deep)" stroke={item.team == null ? COLOR.rift : TEAM_COLOR[item.team]} strokeWidth={2} />
          {icons.shop && <image href={icons.shop} x={-10} y={-10} width={20} height={20} />}
        </>
      );
    case "urnPads":
      return (
        <>
          <circle r={12} fill="var(--ox-deep)" stroke="var(--ivory)" strokeWidth={1.5} />
          {icons.urn && <image href={icons.urn} x={-10} y={-10} width={20} height={20} />}
        </>
      );
    case "bridgeBuffs":
      return (
        <>
          <circle r={9} fill="var(--ox-deep)" stroke="var(--brass)" strokeWidth={2} />
          <path d="M0,-5 L0,5 M-5,0 L5,0" stroke="var(--brass)" strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
    case "camps": {
      const s = CAMP[item.tier ?? "small"].size;
      return <image href={icons[item.tier ?? "small"]} x={-s / 2} y={-s / 2} width={s} height={s} />;
    }
    case "sinners":
      return <image href={icons.vault} x={-22} y={-22} width={44} height={44} />;
    case "rifts":
      return (
        <>
          <polygon points={hexagon(12)} fill="var(--ox-deep)" stroke={COLOR.rift} strokeWidth={2} />
          <path d="M-4,-5 Q4,-2 -1,1 Q-5,4 4,6" fill="none" stroke={COLOR.rift} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case "teleporters":
      return icons.teleporter ? (
        <>
          <circle r={11} fill="var(--ox-deep)" />
          <image href={icons.teleporter} x={-11} y={-11} width={22} height={22} />
        </>
      ) : (
        <>
          <circle r={7.5} fill="var(--ox-deep)" stroke={COLOR.travel} strokeWidth={2} />
          <circle r={3} fill={COLOR.travel} />
        </>
      );
    case "jumpPads":
      return (
        <>
          <circle r={7} fill="var(--ox-deep)" stroke={COLOR.travel} strokeWidth={1.5} />
          <path d="M-3.5,1.5 L0,-2 L3.5,1.5" fill="none" stroke={COLOR.travel} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "ropes":
      return (
        <>
          <path d="M0,-6 L0,6" stroke="var(--ivory-dim)" strokeWidth={2} strokeLinecap="round" />
          <circle cy={-6} r={2.2} fill="var(--ivory-dim)" />
        </>
      );
    case "snacks":
      return <circle r={3.2} fill={COLOR.snack} stroke="var(--ox-deep)" strokeWidth={1} />;
    case "vents":
      return <circle r={3} fill={COLOR.vent} stroke="var(--ox-deep)" strokeWidth={1} />;
    case "veils":
      return <circle r={3} fill={COLOR.veil} stroke="var(--ox-deep)" strokeWidth={1} />;
    case "statues":
      return <polygon points={diamond(3.8)} fill={COLOR.statue} stroke="var(--ox-deep)" strokeWidth={1} />;
    case "crates":
      return <rect x={-2.6} y={-2.6} width={5.2} height={5.2} fill={COLOR.crate} stroke="var(--ox-deep)" strokeWidth={1} />;
    case "toughCrates":
      return <rect x={-3.4} y={-3.4} width={6.8} height={6.8} fill={COLOR.tough} stroke="var(--ox-deep)" strokeWidth={1} />;
    default:
      return null;
  }
}

/** Muestra de la leyenda: la misma forma que en el mapa, a tamaño fijo. */
function Swatch({ id, icons, lanes }: { id: LayerId; icons: MapDetail["icons"]; lanes: MapDetail["lanes"] }) {
  if (id === "ziplines") {
    return (
      <svg width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true">
        {lanes.map((l, i) => (
          <path key={l.lane} d={`M-9,${-5 + i * 5} Q0,${-9 + i * 5} 9,${-5 + i * 5}`} fill="none" stroke={l.color} strokeWidth={2} />
        ))}
      </svg>
    );
  }
  if (id === "tunnelsMid" || id === "tunnelsRat") {
    return (
      <svg width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true">
        <path d="M-9,4 L-3,4 L-3,-4 L9,-4" fill="none" stroke="var(--tunnel)" strokeWidth={id === "tunnelsMid" ? 4 : 2.2} />
      </svg>
    );
  }
  const sample: Item = { key: id, layer: id, u: 0, v: 0, title: "", detail: "", team: 0, tier: "medium" };
  const scale: Partial<Record<LayerId, number>> = { midBoss: 0.62, rifts: 0.62, sinners: 0.85, camps: 0.95, shops: 0.8, urnPads: 0.8 };
  return (
    <svg width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true" className="overflow-visible">
      <g transform={scale[id] ? `scale(${scale[id]})` : undefined}>
        <Glyph item={sample} icons={icons} />
      </g>
    </svg>
  );
}

/* ---------- Capa de marcadores (memorizada: desplazar el mapa no la repinta) ---------- */

const POINT_LAYERS: LayerId[] = [
  "crates",
  "statues",
  "toughCrates",
  "vents",
  "veils",
  "snacks",
  "ropes",
  "camps",
  "sinners",
  "jumpPads",
  "teleporters",
  "bridgeBuffs",
  "urnPads",
  "shops",
  "rifts",
  "sentries",
  "midBoss",
];
const FOCUSABLE = new Set<LayerId>([
  "midBoss",
  "shops",
  "urnPads",
  "bridgeBuffs",
  "rifts",
  "sinners",
  "teleporters",
]);

const P = (n: number) => n * 1000;

const Markers = memo(function Markers({
  data,
  items,
  visible,
  ms,
  selected,
}: {
  data: MapDetail;
  items: Item[];
  visible: Record<LayerId, boolean>;
  /** Unidades del SVG por píxel de pantalla (ya incluye el zoom). */
  ms: number;
  selected: Item | null;
}) {
  const byLayer = useMemo(() => {
    const m = new Map<LayerId, Item[]>();
    for (const it of items) m.set(it.layer, [...(m.get(it.layer) ?? []), it]);
    return m;
  }, [items]);
  const line = (px: number) => px * ms;

  return (
    <svg viewBox="0 0 1000 1000" className="absolute inset-0 size-full overflow-visible" role="presentation">
      {visible.ziplines &&
        data.lanes.map((l) => (
          <g key={l.lane}>
            <path d={l.path} fill="none" stroke="var(--ox-deep)" strokeWidth={line(5)} strokeLinecap="round" opacity={0.7} />
            <path d={l.path} fill="none" stroke={l.color} strokeWidth={line(2.5)} strokeLinecap="round" />
          </g>
        ))}

      {(["teleporters", "jumpPads"] as const).map(
        (layer) =>
          visible[layer] &&
          byLayer.get(layer)?.map((it) => {
            if (!it.to) return null;
            const [x1, y1, x2, y2] = [P(it.u), P(it.v), P(it.to.u), P(it.to.v)];
            // Arco para los saltos; recta para los teletransportes.
            const mx = (x1 + x2) / 2 - (y2 - y1) * 0.25;
            const my = (y1 + y2) / 2 + (x2 - x1) * 0.25;
            return (
              <path
                key={`${it.key}-link`}
                d={layer === "jumpPads" ? `M${x1},${y1} Q${mx},${my} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`}
                fill="none"
                stroke={COLOR.travel}
                strokeWidth={line(1.5)}
                strokeDasharray={`${line(5)} ${line(4)}`}
                opacity={0.8}
              />
            );
          }),
      )}

      {POINT_LAYERS.map(
        (layer) =>
          visible[layer] &&
          byLayer.get(layer)?.map((it) => {
            const focus = FOCUSABLE.has(layer);
            return (
              <g
                key={it.key}
                data-key={it.key}
                transform={`translate(${P(it.u)} ${P(it.v)}) scale(${ms})`}
                className="map-marker"
                tabIndex={focus ? 0 : undefined}
                role={focus ? "button" : undefined}
                aria-label={focus ? `${it.title}${it.where ? `, ${it.where}` : ""}` : undefined}
              >
                {/* Zona de clic generosa para los puntos pequeños */}
                <circle r={11} fill="transparent" />
                <Glyph item={it} icons={data.icons} />
              </g>
            );
          }),
      )}

      {selected && (
        <g transform={`translate(${P(selected.u)} ${P(selected.v)}) scale(${ms})`} pointerEvents="none">
          <circle r={20} fill="none" stroke="var(--ivory)" strokeWidth={1.5} className="map-pulse" />
          <circle r={20} fill="none" stroke="var(--ivory)" strokeWidth={1.5} />
        </g>
      )}

      {/* Orientación: nombre de cada equipo junto a su base */}
      {[
        { team: 0 as const, u: 0.62, v: 0.94 },
        { team: 1 as const, u: 0.38, v: 0.06 },
      ].map((t) => (
        <text
          key={t.team}
          x={P(t.u)}
          y={P(t.v)}
          fontSize={line(13)}
          textAnchor="middle"
          fill={TEAM_COLOR[t.team]}
          className="map-team-label"
        >
          {TEAM[t.team].toUpperCase()}
        </text>
      ))}
    </svg>
  );
});

/* ---------- Mapa con zoom y desplazamiento ---------- */

type View = { x: number; y: number; k: number };
/** Fracción del visor reservada como margen a cada lado (debe coincidir con .map-content en globals.css). */
const MAP_INSET = 0.035;
const MIN_K = 1;
const MAX_K = 8;

export function InteractiveMap({ data }: { data: MapDetail }) {
  const t = useT().map;
  const { num } = useFormat();
  const items = useMemo(() => buildItems(data, t), [data, t]);
  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const counts = useMemo(() => {
    const c: Partial<Record<LayerId, number>> = { ziplines: data.lanes.length };
    for (const it of items) c[it.layer] = (c[it.layer] ?? 0) + 1;
    return c;
  }, [items, data.lanes.length]);

  const [visible, setVisible] = useState(DEFAULTS);
  const [openGroup, setOpenGroup] = useState<string | null>(GROUPS[0].id);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = selectedKey ? (byKey.get(selectedKey) ?? null) : null;
  const shownSelected = selected && visible[selected.layer] ? selected : null;

  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(800);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize(e.contentRect.width || 800));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = useCallback(
    (v: View): View => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
      const min = size - size * k;
      return { k, x: Math.min(0, Math.max(min, v.x)), y: Math.min(0, Math.max(min, v.y)) };
    },
    [size],
  );

  /** Zoom alrededor de un punto del visor (en píxeles). */
  const zoomAt = useCallback(
    (factor: number, px: number, py: number) =>
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
        const r = k / v.k;
        return clamp({ k, x: px - (px - v.x) * r, y: py - (py - v.y) * r });
      }),
    [clamp],
  );

  // La rueda necesita un listener no pasivo para poder evitar el scroll de la página.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Arrastre con uno o dos dedos (pellizco), y clic sin arrastre para seleccionar.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; downKey: string | null; dist: number; sx: number; sy: number }>({
    moved: false,
    downKey: null,
    dist: 0,
    sx: 0,
    sy: 0,
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
    const el = viewport.current!;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = {
        moved: false,
        downKey: (e.target as Element).closest("[data-key]")?.getAttribute("data-key") ?? null,
        dist: 0,
        sx: e.clientX,
        sy: e.clientY,
      };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.moved = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = viewport.current!.getBoundingClientRect();
      if (gesture.current.dist > 0) zoomAt(dist / gesture.current.dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      gesture.current.dist = dist;
      return;
    }
    // Un clic con un temblor de pocos píxeles sigue siendo un clic.
    if (!gesture.current.moved && Math.hypot(cur.x - gesture.current.sx, cur.y - gesture.current.sy) < 5) return;
    gesture.current.moved = true;
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0 && !gesture.current.moved) setSelectedKey(gesture.current.downKey);
    if (pointers.current.size < 2) gesture.current.dist = 0;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = (e.target as Element).getAttribute?.("data-key");
    if (key && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setSelectedKey(key);
      return;
    }
    const step = 60;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (pan[e.key]) {
      e.preventDefault();
      setView((v) => clamp({ ...v, x: v.x + pan[e.key][0], y: v.y + pan[e.key][1] }));
    } else if (e.key === "+" || e.key === "=") zoomAt(1.4, size / 2, size / 2);
    else if (e.key === "-") zoomAt(1 / 1.4, size / 2, size / 2);
    else if (e.key === "0") setView({ x: 0, y: 0, k: 1 });
    else if (e.key === "Escape") setSelectedKey(null);
  };

  // Si el visor cambia de tamaño, el desplazamiento guardado se vuelve a encajar al pintar.
  const shown = clamp(view);
  // En visores pequeños los marcadores encogen un poco para no taparse entre sí.
  const ms = (1000 / (size * (1 - 2 * MAP_INSET))) * shown.k ** -0.75 * Math.min(1, size / 720) ** 0.5;
  const toggle = (id: LayerId) => setVisible((v) => ({ ...v, [id]: !v[id] }));
  const setGroup = (g: (typeof GROUPS)[number], on: boolean) =>
    setVisible((v) => ({ ...v, ...Object.fromEntries(g.layers.map((l) => [l.id, on])) }));
  const setAll = (on: boolean) =>
    setVisible((v) => Object.fromEntries(Object.keys(v).map((k) => [k, on])) as Record<LayerId, boolean>);
  const allOn = Object.values(visible).every(Boolean);

  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="map-frame">
        <div
          ref={viewport}
          className="map-viewport"
          tabIndex={0}
          role="application"
          aria-label={t.viewport}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div
            className="absolute inset-0 origin-top-left"
            style={{ transform: `translate(${shown.x}px, ${shown.y}px) scale(${shown.k})` }}
          >
            {/* Margen interior: las tirolinas y la tienda de la base llegan al borde del mapa y se cortaban */}
            <div className="map-content">
              <div className="map-plate" style={{ maskImage: `url(${data.images.plate})`, WebkitMaskImage: `url(${data.images.plate})` }} />
              {visible.tunnelsMid && data.images.midTunnels && (
                <div
                  className="map-tunnels"
                  style={{ maskImage: `url(${data.images.midTunnels})`, WebkitMaskImage: `url(${data.images.midTunnels})` }}
                />
              )}
              {visible.tunnelsRat && data.images.ratTunnels && (
                <div
                  className="map-tunnels"
                  style={{ maskImage: `url(${data.images.ratTunnels})`, WebkitMaskImage: `url(${data.images.ratTunnels})` }}
                />
              )}
              <Markers data={data} items={items} visible={visible} ms={ms} selected={shownSelected} />
            </div>
          </div>

          <div className="map-zoom" role="group" aria-label={t.zoom}>
            <button type="button" onClick={() => zoomAt(1.5, size / 2, size / 2)} aria-label={t.zoomIn} title={t.zoomIn}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <button type="button" onClick={() => zoomAt(1 / 1.5, size / 2, size / 2)} aria-label={t.zoomOut} title={t.zoomOut}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 7h10" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setView({ x: 0, y: 0, k: 1 })}
              aria-label={t.fit}
              title={t.fit}
              disabled={shown.k === 1}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
          <p className="map-scale" aria-live="polite">
            {num(shown.k, shown.k % 1 === 0 ? 0 : 1)}×
          </p>
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto">
        <section className="panel min-h-[7rem] p-4" aria-live="polite" aria-label={t.selected}>
          {shownSelected ? (
            <div>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center border border-brass-dim bg-ox-deep">
                  <Swatch id={shownSelected.layer} icons={data.icons} lanes={data.lanes} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-tight text-ivory">{shownSelected.title}</h2>
                  {shownSelected.where && <p className="mt-0.5 text-sm text-brass">{shownSelected.where}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="-mr-1 -mt-1 grid size-8 shrink-0 cursor-pointer place-items-center text-ivory-dim transition-colors hover:text-brass"
                  aria-label={t.close}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              </div>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ivory-dim">{shownSelected.detail}</p>
              {shownSelected.images && shownSelected.images.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {shownSelected.images.map((im) => (
                    <li key={im.label} className="flex items-center gap-2 text-sm text-ivory">
                      <Image src={im.src} alt="" width={28} height={28} unoptimized />
                      {im.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-ivory-dim">{t.hint}</p>
          )}
        </section>

        <section aria-labelledby="capas" className="panel p-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="capas" className="font-display text-2xl tracking-[0.12em] text-brass">
              {t.layers.toUpperCase()}
            </h2>
            <div className="flex gap-3 text-sm">
              <button type="button" onClick={() => setAll(!allOn)} className="map-text-btn">
                {allOn ? t.hideAll : t.showAll}
              </button>
              <button type="button" onClick={() => setVisible(DEFAULTS)} className="map-text-btn">
                {t.reset}
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-ivory-dim">{t.layersHint}</p>
          <ul className="mt-3 border-y border-brass-dim/40">
            {GROUPS.map((g) => {
              const on = g.layers.filter((l) => visible[l.id]).length;
              const state = on === 0 ? "none" : on === g.layers.length ? "all" : "some";
              const isOpen = openGroup === g.id;
              return (
                <li key={g.id} className="border-b border-brass-dim/25 last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
                      aria-label={t.toggleGroup(t.groups[g.id as keyof typeof t.groups])}
                      className="map-check map-check-btn"
                      data-state={state}
                      onClick={() => setGroup(g, state !== "all")}
                    />
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenGroup(isOpen ? null : g.id)}
                      className="map-group-head"
                    >
                      <span className="flex-1 text-left">{t.groups[g.id as keyof typeof t.groups]}</span>
                      <span className="text-sm font-normal normal-case tracking-normal text-ivory-dim">
                        {on}/{g.layers.length}
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        aria-hidden="true"
                        className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </button>
                  </div>
                  {isOpen && (
                    <ul className="pb-2 pl-[1.65rem]">
                      {g.layers.map((l) => (
                        <li key={l.id}>
                          <label className="map-layer">
                            <input type="checkbox" checked={visible[l.id]} onChange={() => toggle(l.id)} />
                            <span className="map-check" aria-hidden="true" />
                            <Swatch id={l.id} icons={data.icons} lanes={data.lanes} />
                            <span className="flex-1">{t.layerNames[l.id]}</span>
                            {counts[l.id] !== undefined && <span className="text-sm text-ivory-dim">{counts[l.id]}</span>}
                          </label>
                          {l.id === "ziplines" && (
                            <p className="mb-1 ml-[2.95rem] flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ivory-dim">
                              {data.lanes.map((ln) => (
                                <span key={ln.lane} className="inline-flex items-center gap-1.5">
                                  <span className="inline-block h-0.5 w-3" style={{ background: ln.color }} aria-hidden="true" />
                                  {ln.name}
                                </span>
                              ))}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
