"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

/** Bloque de texto (comando, parámetros, ruta) con botón para copiarlo. */
export function CopyBlock({ text, label }: { text: string; label: string }) {
  const t = useT().common;
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("ok");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <div className="border border-brass-dim">
      <div className="flex items-center justify-between border-b border-brass-dim px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="bg-brass px-2.5 py-1 text-xs font-bold uppercase tracking-[0.1em] text-ox-deep transition-colors hover:bg-ivory"
        >
          <span aria-live="polite">{state === "ok" ? t.copied : state === "error" ? t.copyFailed : t.copy}</span>
        </button>
      </div>
      <code className="block overflow-x-auto bg-ox-deep px-3 py-3 text-sm leading-relaxed text-ivory [overflow-wrap:anywhere]">
        {text}
      </code>
    </div>
  );
}
