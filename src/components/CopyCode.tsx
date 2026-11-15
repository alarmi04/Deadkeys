"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

/** Muestra el código de una build y lo copia al portapapeles con un clic. */
export function CopyCode({ code, label }: { code: string; label?: string }) {
  const t = useT().common;
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setState("ok");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <span className="inline-flex items-stretch border border-brass-dim text-xs">
      <span className="px-2 py-1 text-ivory-dim">{label ?? t.code}</span>
      <code className="select-all border-l border-brass-dim px-2 py-1 font-semibold tabular-nums text-ivory">{code}</code>
      <button
        type="button"
        onClick={copy}
        className="border-l border-brass-dim bg-brass px-2.5 py-1 font-bold uppercase tracking-[0.1em] text-ox-deep transition-colors hover:bg-ivory"
      >
        <span aria-live="polite">{state === "ok" ? t.copied : state === "error" ? t.copyFailed : t.copy}</span>
      </button>
    </span>
  );
}
