"use client";

import Form from "next/form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useT } from "@/i18n/client";

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" strokeLinecap="square" />
    </svg>
  );
}

export type Suggestion = {
  accountId: number;
  name: string;
  avatar: string;
  country: string | null;
  rank: { name: string; image: string | null } | null;
};

export function SearchForm({ defaultValue = "", size = "lg" }: { defaultValue?: string; size?: "lg" | "md" }) {
  const lg = size === "lg";
  const router = useRouter();
  const lang = useLocale();
  const t = useT().common.search;
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Con cacheComponents las páginas ocultas conservan su estado (Activity), así que el
  // input mantendría la búsqueda anterior. Los efectos se vuelven a ejecutar cada vez que
  // la página se muestra de nuevo: ahí devolvemos el valor al de la URL actual.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(defaultValue);
    setOpen(false);
  }, [defaultValue]);

  // Sugerencias: espera a que se deje de escribir y descarta respuestas de consultas anteriores.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/jugadores/buscar?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("bad response");
        setResults(await res.json());
        setActive(-1);
        setStatus("done");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Cierra el combo al hacer clic fuera.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (p: Suggestion) => {
    setOpen(false);
    router.push(`/${lang}/jugadores/${p.accountId}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (results.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const n = results.length;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i <= 0 ? n - 1 : i - 1)));
    } else if (e.key === "Enter" && open && active >= 0 && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <Form action={`/${lang}/jugadores`} role="search" className="w-full">
      <label htmlFor="q" className="sr-only">
        {t.label}
      </label>
      <div ref={boxRef} className="relative">
        <div
          className={`flex items-stretch border border-brass bg-ox-deep transition-colors focus-within:border-ivory ${lg ? "h-16" : "h-13"}`}
        >
          <SearchIcon className="ml-5 hidden w-6 shrink-0 self-center text-brass-dim sm:block" />
          <input
            id="q"
            name="q"
            type="search"
            required
            minLength={2}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={t.placeholder}
            className={`min-w-0 flex-1 bg-transparent px-4 text-ivory caret-brass outline-none! ${lg ? "text-xl" : "text-lg"}`}
          />
          <button
            type="submit"
            className="shrink-0 bg-brass px-5 font-bold uppercase tracking-[0.14em] text-ox-deep transition-colors hover:bg-ivory sm:px-7"
          >
            {t.submit}
          </button>
        </div>

        {showPanel && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 max-h-[26rem] overflow-y-auto border border-t-0 border-brass bg-ox-deep shadow-2xl"
          >
            {status === "loading" && results.length === 0 && (
              <li role="presentation" className="px-4 py-3 text-ivory-dim">
                {t.searching}
              </li>
            )}
            {status === "error" && (
              <li role="presentation" className="px-4 py-3 text-ivory-dim">
                {t.error}
              </li>
            )}
            {status === "done" && results.length === 0 && (
              <li role="presentation" className="px-4 py-3 text-ivory-dim">
                {t.noMatch(query.trim())}
              </li>
            )}
            {results.map((p, i) => (
              <li
                key={p.accountId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(p)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-4 text-left border-b border-brass-dim/40 px-4 py-2.5 last:border-b-0 ${i === active ? "bg-wine/60" : ""}`}
              >
                <Image src={p.avatar} alt="" width={44} height={44} className="size-11 shrink-0 border border-brass-dim" />
                <span className="min-w-0 flex-1 text-left">
                  <span className={`block truncate text-lg font-semibold leading-tight ${i === active ? "text-brass" : "text-ivory"}`}>
                    {p.name}
                  </span>
                  <span className="block truncate text-sm text-ivory-dim">
                    ID {p.accountId}
                    {p.country && ` · ${p.country}`}
                  </span>
                </span>
                <span className="ml-auto flex shrink-0 items-center justify-end gap-2 text-right">
                  {p.rank ? (
                    <>
                      {p.rank.image && <Image src={p.rank.image} alt="" width={36} height={36} className="size-9" />}
                      <span className="text-sm font-semibold text-ivory">{p.rank.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-ivory-dim">{t.unranked}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Form>
  );
}
