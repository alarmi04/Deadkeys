/*
 * Datos de contacto y del responsable del sitio, usados por /acerca, /privacidad y el pie de
 * página. Se configuran con variables de entorno
 * para no dejar datos personales en el repositorio:
 *   NEXT_PUBLIC_CONTACT_EMAIL  correo público de contacto (obligatorio antes de publicar)
 *   NEXT_PUBLIC_SITE_URL       URL pública, p. ej. https://deadkeys.app
 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contacto@example.com";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
export const LAST_UPDATED = { es: "14 de noviembre de 2026", en: "November 14, 2026" } as const;

/** URL absoluta de una ruta del sitio (sin barra final duplicada). */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL.endsWith("/") ? SITE_URL : `${SITE_URL}/`).toString();
}

/** Serializa JSON-LD de forma segura para incrustarlo en un <script>. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\u003c");
}

/** Migas de pan en formato schema.org. */
export function breadcrumbLd(trail: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  };
}

/** Recorta un texto a una longitud razonable para meta description. */
export function clip(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
