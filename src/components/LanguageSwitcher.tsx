"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LANGUAGE_NAME, locales } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

/** Cambia de idioma conservando la ruta y la consulta actuales. */
export function LanguageSwitcher({ large = false }: { large?: boolean }) {
  const lang = useLocale();
  const t = useT();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const rest = pathname.replace(new RegExp(`^/${lang}(?=/|$)`), "");
  return (
    <ul aria-label={t.common.language} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em]">
      {locales.map((l) => (
        <li key={l}>
          <NextLink
            href={`/${l}${rest}${search ? `?${search}` : ""}`}
            hrefLang={l}
            lang={l}
            title={LANGUAGE_NAME[l]}
            aria-current={l === lang ? "true" : undefined}
            className={`${large ? "inline-flex min-h-11 min-w-11 items-center justify-center px-3" : "px-2 py-1"} no-underline transition-colors ${l === lang ? "bg-brass text-ox-deep" : "text-ivory-dim hover:text-brass"}`}
          >
            {l}
          </NextLink>
        </li>
      ))}
    </ul>
  );
}
