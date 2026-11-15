"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localePath } from "@/i18n/config";
import { useLocale } from "@/i18n/client";

/** `next/link` que antepone el idioma actual a las rutas internas. */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const lang = useLocale();
  return <NextLink href={typeof href === "string" ? localePath(lang, href) : href} {...props} />;
}
