"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import { makeFormat } from "@/lib/format";
import { clientMessages, type ClientMessages } from "./messages/client";

const LocaleContext = createContext<Locale>("es");

export function I18nProvider({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Textos del idioma actual en componentes de cliente (solo las secciones de messages/client.ts). */
export function useT(): ClientMessages {
  return clientMessages[useContext(LocaleContext)];
}

export function useFormat() {
  return makeFormat(useContext(LocaleContext));
}
