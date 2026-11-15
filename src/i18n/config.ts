export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
/** Idioma por defecto: el del producto y el de `x-default` en hreflang. */
export const defaultLocale: Locale = "es";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const OG_LOCALE: Record<Locale, string> = { es: "es_ES", en: "en_US" };
export const LANGUAGE_NAME: Record<Locale, string> = { es: "Español", en: "English" };

/** Rutas que no llevan prefijo de idioma (handlers, no páginas). */
const UNPREFIXED = ["/api/", "/tracker/ir"];

/** Añade el prefijo de idioma a una ruta interna ("/heroes?x=1" → "/es/heroes?x=1"). */
export function localePath(lang: Locale, path: string): string {
  if (!path.startsWith("/") || UNPREFIXED.some((p) => path.startsWith(p))) return path;
  if (path === "/" || path.startsWith("/?") || path.startsWith("/#")) return `/${lang}${path.slice(1)}`;
  if (locales.some((l) => path === `/${l}` || path.startsWith(`/${l}/`) || path.startsWith(`/${l}?`))) return path;
  return `/${lang}${path}`;
}

/** hreflang para una ruta sin prefijo: un enlace por idioma más x-default. */
export function languageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) out[l] = localePath(l, path);
  out["x-default"] = localePath(defaultLocale, path);
  return out;
}
