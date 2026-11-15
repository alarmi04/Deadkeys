import { jsonLd } from "@/lib/site";

/** Datos estructurados (schema.org) para buscadores. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
