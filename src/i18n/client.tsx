"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import { makeFormat } from "@/lib/format";
import { messages, type Messages } from "./messages";

const LocaleContext = createContext<Locale>("es");

export function I18nProvider({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Textos del idioma actual en componentes de cliente. */
export function useT(): Messages {
  return messages[useContext(LocaleContext)];
}

export function useFormat() {
  return makeFormat(useContext(LocaleContext));
}
