import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** Perfil de jugador: cabeza y hombros. */
export function UserIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5" />
    </svg>
  );
}

/** Marca de Steam simplificada: disco, anillo de engranaje y piñón unidos por una barra. */
export function SteamIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="15.2" cy="9.4" r="3" />
      <circle cx="8.6" cy="15.6" r="1.9" />
      <path d="M10.2 14.4l2.9-2.4" />
    </svg>
  );
}

function Svg({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      {children}
    </svg>
  );
}

/** Tendencia al alza: héroes en ascenso. */
export function TrendIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </Svg>
  );
}

/** Copa: clasificación y competitivo. */
export function TrophyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 007.5 11M17 6h3v1.5a3.5 3.5 0 01-3.5 3.5" />
      <path d="M12 14v4M8 20h8" />
    </Svg>
  );
}

/** Señal en emisión: partidas en directo. */
export function RadioIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="2" />
      <path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4M4.9 4.9a10 10 0 000 14.2M19.1 4.9a10 10 0 010 14.2" />
    </Svg>
  );
}

/** Nota de parche: hoja con líneas. */
export function ScrollIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h9l4 4v14H6V3z" />
      <path d="M14 3v5h5M9 13h7M9 17h7" />
    </Svg>
  );
}

/** Mapa plegado. */
export function MapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  );
}

/** Dos jugadores: comparar y compañeros. */
export function UsersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c.5-3 3-4.8 6-4.8s5.5 1.8 6 4.8" />
      <path d="M16 5a3.2 3.2 0 010 6M18 14.5c1.7.6 2.8 2.1 3 4.5" />
    </Svg>
  );
}

/** Rayo: habilidades. */
export function BoltIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 2L5 13.5h6L10 22l9-12h-6.5L13 2z" />
    </Svg>
  );
}

/** Barras: estadísticas. */
export function BarsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Svg>
  );
}

/** Cofre: objetos. */
export function ChestIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10a9 5 0 0118 0v9H3v-9z" />
      <path d="M3 12h18M12 11v4" />
    </Svg>
  );
}

/** Martillo: builds. */
export function HammerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4l6 6-3 3-6-6 3-3z" />
      <path d="M11 7L4 14l3 3 7-7M6 19l-2 2" />
    </Svg>
  );
}

/** Libro abierto: historia. */
export function BookIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z" />
      <path d="M12 6v14" />
    </Svg>
  );
}

/** Reloj: historial y partidas recientes. */
export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

/** Lista con viñetas: resumen. */
export function ListIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <circle cx="4.5" cy="6" r=".8" />
      <circle cx="4.5" cy="12" r=".8" />
      <circle cx="4.5" cy="18" r=".8" />
    </Svg>
  );
}

/** Prohibido: héroes vetados. */
export function BanIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </Svg>
  );
}

/** Escudo: counters. */
export function ShieldIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6l8-3z" />
    </Svg>
  );
}

/** Diana: cuándo comprarlo. */
export function TargetIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  );
}

/** Información: qué hace. */
export function InfoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.1" />
    </Svg>
  );
}

/** Espadas cruzadas: héroes y frente a frente. */
export function SwordsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 4l9 9M4 4v4l1 1M4 4h4l1 1" />
      <path d="M20 4l-9 9M20 4v4l-1 1M20 4h-4l-1 1" />
      <path d="M8 15l-3 3M16 15l3 3M11 14l-2 2M13 14l2 2" />
    </Svg>
  );
}

/** Velocímetro: rendimiento. */
export function GaugeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 17a8 8 0 1116 0" />
      <path d="M12 17l4-5" />
    </Svg>
  );
}

const NAMED = {
  trend: TrendIcon, trophy: TrophyIcon, radio: RadioIcon, scroll: ScrollIcon, map: MapIcon,
  users: UsersIcon, bolt: BoltIcon, bars: BarsIcon, chest: ChestIcon, hammer: HammerIcon,
  book: BookIcon, clock: ClockIcon, list: ListIcon, ban: BanIcon, shield: ShieldIcon,
  target: TargetIcon, info: InfoIcon, swords: SwordsIcon, gauge: GaugeIcon, user: UserIcon,
} as const;

export type IconName = keyof typeof NAMED;

/** Icono por nombre, para datos (como TOOLS) que no pueden guardar componentes. */
export function Icon({ name, ...p }: IconProps & { name: IconName }) {
  const C = NAMED[name];
  return <C {...p} />;
}
