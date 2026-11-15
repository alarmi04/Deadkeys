import type { MetadataRoute } from "next";
import { defaultLocale, localePath, locales } from "@/i18n/config";
import { getHeroes, getItems, safe } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

type Entry = MetadataRoute.Sitemap[number];
type Freq = Entry["changeFrequency"];

const STATIC: { path: string; changeFrequency: Freq; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/heroes", changeFrequency: "daily", priority: 0.9 },
  { path: "/herramientas/tierlist", changeFrequency: "daily", priority: 0.9 },
  { path: "/objetos", changeFrequency: "daily", priority: 0.8 },
  { path: "/builds", changeFrequency: "daily", priority: 0.8 },
  { path: "/tracker", changeFrequency: "daily", priority: 0.8 },
  { path: "/parches", changeFrequency: "daily", priority: 0.7 },
  { path: "/herramientas", changeFrequency: "monthly", priority: 0.6 },
  { path: "/herramientas/mapa", changeFrequency: "monthly", priority: 0.6 },
  { path: "/herramientas/rendimiento/complock", changeFrequency: "monthly", priority: 0.5 },
  { path: "/competitivo", changeFrequency: "weekly", priority: 0.5 },
  { path: "/acerca", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.2 },
];

/** Una entrada por idioma, cada una con sus alternativas hreflang. */
function entries(path: string, changeFrequency: Freq, priority: number): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = absoluteUrl(localePath(l, path));
  languages["x-default"] = absoluteUrl(localePath(defaultLocale, path));
  return locales.map((l) => ({
    url: absoluteUrl(localePath(l, path)),
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [heroes, items] = await Promise.all([safe(getHeroes()), safe(getItems("es"))]);

  return [
    ...STATIC.flatMap((p) => entries(p.path, p.changeFrequency, p.priority)),
    ...(heroes ?? []).filter((h) => h.playable).flatMap((h) => entries(`/heroes/${h.id}`, "daily", 0.8)),
    ...(items ?? [])
      .filter((i) => i.type === "upgrade" && i.inShop)
      .flatMap((i) => entries(`/objetos/${i.id}`, "weekly", 0.6)),
  ];
}
