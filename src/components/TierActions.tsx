"use client";

import Link from "@/components/Link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { EDITOR_PATH, type Row, STORAGE_KEY, encodeRows } from "@/lib/tierlist";

/** ¿Hay ya héroes colocados en la tier list guardada del usuario? */
function hasSavedList(): boolean {
  try {
    return /~\d/.test(window.localStorage.getItem(STORAGE_KEY) ?? "");
  } catch {
    return false;
  }
}

/**
 * Pasa la tier list por rango al editor del usuario para que parta de ahí. Viaja por la URL (?base=…) en vez de por
 * el almacenamiento: así el editor la recibe aunque ya estuviera abierto en segundo plano.
 */
export function UseAsBase({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const lang = useLocale();
  const t = useT().tierlist;
  const [confirming, setConfirming] = useState(false);

  const go = () => router.push(localePath(lang, `${EDITOR_PATH}?base=${encodeURIComponent(encodeRows(rows))}`));

  // La confirmación es un aviso en la propia página: los cuadros del navegador pueden estar bloqueados.
  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="alert">
        <p className="text-sm text-ivory">{t.replaceWarning}</p>
        <button type="button" className="tier-btn tier-btn-primary" onClick={go}>
          {t.replace}
        </button>
        <button type="button" className="tier-btn" onClick={() => setConfirming(false)}>
          {t.cancel}
        </button>
      </div>
    );
  }
  return (
    <button type="button" className="tier-btn tier-btn-primary" onClick={() => (hasSavedList() ? setConfirming(true) : go())}>
      {t.useAsBase}
    </button>
  );
}

/** Los enlaces compartidos antiguos apuntaban a /herramientas/tierlist#t=…: ahora el editor vive en otra ruta. */
export function RedirectSharedList() {
  const router = useRouter();
  const lang = useLocale();
  useEffect(() => {
    if (window.location.hash.startsWith("#t=")) router.replace(localePath(lang, `${EDITOR_PATH}${window.location.hash}`));
  }, [router, lang]);
  return null;
}

/** Pestañas entre la vista por rango y el editor. */
export function TierTabs() {
  const lang = useLocale();
  const t = useT().tierlist;
  const pathname = usePathname().replace(new RegExp(`^/${lang}(?=/|$)`), "");
  const tabs = [
    { href: "/herramientas/tierlist", label: t.byRank, on: pathname === "/herramientas/tierlist" },
    { href: EDITOR_PATH, label: t.mine, on: pathname === EDITOR_PATH },
  ];
  return (
    <nav aria-label={t.tabsAria} className="mt-8 flex gap-6 border-b border-brass-dim">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.on ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2.5 pt-1 text-sm font-semibold uppercase tracking-[0.16em] no-underline transition-colors ${
            tab.on ? "border-brass text-brass" : "border-transparent text-ivory hover:text-brass"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
