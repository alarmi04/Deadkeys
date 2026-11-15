"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import Link from "@/components/Link";
import { useT } from "@/i18n/client";
import { GA_ID } from "@/lib/site";

type Choice = "granted" | "denied" | null;

const KEY = "deadkeys-consent";
const EVENT = "deadkeys-consent-change";

function read(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Borra las cookies de Google Analytics (_ga, _ga_*) al rechazar o retirar el consentimiento. */
function clearGaCookies() {
  const parts = location.hostname.split(".");
  const domains = ["", ...parts.map((_, i) => `.${parts.slice(i).join(".")}`)];
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

/**
 * Detiene Google Analytics en la página actual si ya se había cargado: el script de gtag sigue en memoria
 * hasta recargar, así que se le retira el permiso y se activa su interruptor oficial de desactivación.
 */
function stopAnalytics() {
  const w = window as unknown as Record<string, unknown> & { gtag?: (...args: unknown[]) => void };
  w[`ga-disable-${GA_ID}`] = true;
  w.gtag?.("consent", "update", { analytics_storage: "denied" });
  clearGaCookies();
}

function choose(c: "granted" | "denied") {
  try {
    localStorage.setItem(KEY, c);
  } catch {}
  if (c === "denied") stopAnalytics();
  else (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = false;
  window.dispatchEvent(new Event(EVENT));
}

/** Vuelve a mostrar el banner (enlace «Cookies» del pie). */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useT();
  if (!GA_ID) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try {
          localStorage.removeItem(KEY);
        } catch {}
        stopAnalytics();
        window.dispatchEvent(new Event(EVENT));
      }}
    >
      {t.common.consent.settings}
    </button>
  );
}

export function CookieConsent() {
  const t = useT().common.consent;
  const choice = useSyncExternalStore(subscribe, read, () => "denied" as Choice);
  if (!GA_ID) return null;

  return (
    <>
      {choice === "granted" && (
        <>
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());
gtag('config','${GA_ID}',{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        </>
      )}
      {choice === null && (
        <div
          role="dialog"
          aria-label={t.title}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-brass-dim bg-[#170809] px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] sm:px-8"
        >
          <div className="mx-auto flex max-w-[1320px] flex-col gap-4 sm:flex-row sm:items-center">
            <p className="max-w-[80ch] text-sm text-ivory-dim">
              <strong className="font-semibold text-ivory">{t.title}.</strong> {t.text}{" "}
              <Link href="/privacidad" className="text-brass underline">
                {t.more}
              </Link>
            </p>
            <div className="flex shrink-0 gap-3 sm:ml-auto">
              <button
                type="button"
                onClick={() => choose("denied")}
                className="border border-brass px-5 py-2 text-sm font-semibold text-brass hover:bg-brass/10"
              >
                {t.reject}
              </button>
              <button
                type="button"
                onClick={() => choose("granted")}
                className="border border-brass bg-brass px-5 py-2 text-sm font-semibold text-[#170809] hover:opacity-90"
              >
                {t.accept}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
