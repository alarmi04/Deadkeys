import type { Locale } from "@/i18n/config";

const INTL: Record<Locale, string> = { es: "es-ES", en: "en-US" };
const TZ: Record<Locale, string> = { es: "Europe/Madrid", en: "UTC" };

/** Formateadores de números y fechas del idioma indicado. */
export function makeFormat(lang: Locale) {
  const loc = INTL[lang];
  const timeZone = TZ[lang];
  const percentSign = lang === "es" ? " %" : "%";

  const pct = (v: number, digits = 1) =>
    `${(v * 100).toLocaleString(loc, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${percentSign}`;

  const num = (v: number, digits = 0) =>
    v.toLocaleString(loc, { minimumFractionDigits: digits, maximumFractionDigits: digits });

  /** 1.234.567 → "1,2 M"; 45.300 → "45,3 k". */
  const compact = (v: number) => v.toLocaleString(loc, { notation: "compact", maximumFractionDigits: 1 });

  const souls = (v: number) => `${(v / 1000).toLocaleString(loc, { maximumFractionDigits: 1 })} k`;

  const duration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const date = (unixOrIso: number | string) =>
    new Date(typeof unixOrIso === "number" ? unixOrIso * 1000 : unixOrIso).toLocaleDateString(loc, {
      day: "numeric",
      month: "short",
      timeZone,
    });

  const dateTime = (unix: number) =>
    new Date(unix * 1000).toLocaleString(loc, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });

  /** Clave de día (AAAA-MM-DD) para agrupar partidas. */
  const dayKey = (unix: number) => new Date(unix * 1000).toLocaleDateString("en-CA", { timeZone });

  const dayLabel = (unix: number) =>
    new Date(unix * 1000).toLocaleDateString(loc, { weekday: "short", day: "numeric", month: "short", timeZone });

  /** "hace 18 h" / "18 h ago", "hace 3 d"; pasado un mes, la fecha. */
  function ago(unix: number, nowMs: number) {
    const min = Math.max(0, Math.floor((nowMs - unix * 1000) / 60000));
    const wrap = (v: string) => (lang === "es" ? `hace ${v}` : `${v} ago`);
    if (min < 60) return wrap(`${Math.max(1, min)} min`);
    if (min < 60 * 24) return wrap(`${Math.floor(min / 60)} h`);
    const days = Math.floor(min / 1440);
    return days < 30 ? wrap(`${days} d`) : date(unix);
  }

  return { pct, num, compact, souls, duration, date, dateTime, dayKey, dayLabel, ago };
}

export type Format = ReturnType<typeof makeFormat>;

export const kda = (k: number, d: number, a: number) => (k + a) / Math.max(d, 1);
