import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Perfiles, partidas y búsquedas llevan noindex en su metadata: no se bloquean aquí para que
        // el rastreador pueda leer ese noindex.
        disallow: ["/api/", "/tracker/ir", "/*/admin"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
