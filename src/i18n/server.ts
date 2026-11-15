import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { isLocale, type Locale } from "./config";
import { messages, type Messages } from "./messages";

/** Idioma de la ruta actual (segmento [lang]) en componentes de servidor. */
export async function getLocale(): Promise<Locale> {
  const l = await lang();
  if (!isLocale(l)) notFound();
  return l;
}

export async function getT(): Promise<Messages> {
  return messages[await getLocale()];
}

export function getMessages(l: Locale): Messages {
  return messages[l];
}
