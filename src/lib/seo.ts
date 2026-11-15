import type { Metadata } from "next";
import { OG_LOCALE, languageAlternates, localePath, locales, type Locale } from "@/i18n/config";

type Opts = {
  lang: Locale;
  /** Ruta sin prefijo de idioma ("/heroes/1"). */
  path: string;
  title: string;
  description: string;
  images?: { url: string; alt?: string }[];
  /** Páginas de datos personales o efímeras: no se indexan. */
  noindex?: boolean;
};

/** Metadatos completos de una página: canonical, hreflang, Open Graph y Twitter en el idioma de la ruta. */
export function pageMeta({ lang, path, title, description, images, noindex }: Opts): Metadata {
  const url = localePath(lang, path);
  return {
    title,
    description,
    alternates: noindex ? undefined : { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      locale: OG_LOCALE[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
      images,
    },
    twitter: {
      card: images?.length ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((i) => i.url),
    },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}
