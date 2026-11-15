import type { MetadataRoute } from "next";
import { defaultLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

export default function manifest(): MetadataRoute.Manifest {
  const c = getMessages(defaultLocale).common;
  return {
    name: `${c.siteName} · ${c.tagline}`,
    short_name: c.siteName,
    description: c.description,
    lang: defaultLocale,
    start_url: `/${defaultLocale}`,
    display: "standalone",
    background_color: "#170809",
    theme_color: "#170809",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
