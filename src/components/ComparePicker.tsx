"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { SearchIcon, type Suggestion } from "@/components/SearchForm";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

/** Buscador de un hueco de la comparación: al elegir un jugador pone su ID en la URL. */
export function ComparePicker({
  slot,
  label,
  others,
}: {
  slot: "a" | "b";
  label: string;
  /** Resto de parámetros de la URL (el otro jugador, el modo) para conservarlos. */
  others: Record<string, string>;
}) {
  const router = useRouter();
  const lang = useLocale();
  const t = useT().common.search;
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

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

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (p: Suggestion) => {
    setOpen(false);
    const params = new URLSearchParams({ ...others, [slot]: String(p.accountId) });
    router.push(localePath(lang, `/tracker?${params}`), { scroll: false });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (results.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const n = results.length;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : i <= 0 ? n - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && results.length > 0) pick(results[active >= 0 ? active : 0]);
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={`${listId}-q`} className="text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">
        {label}
      </label>
      <div className="mt-2 flex h-14 items-stretch border border-brass bg-ox-deep transition-colors focus-within:border-ivory">
        <SearchIcon className="ml-4 w-5 shrink-0 self-center text-brass-dim" />
        <input
          id={`${listId}-q`}
          type="search"
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
          className="min-w-0 flex-1 bg-transparent px-3 text-lg text-ivory caret-brass outline-none!"
        />
      </div>

      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 max-h-[24rem] overflow-y-auto border border-t-0 border-brass bg-ox-deep shadow-2xl"
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
              onClick={() => pick(p)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 border-b border-brass-dim/40 px-3 py-2.5 text-left last:border-b-0 ${i === active ? "bg-wine/60" : ""}`}
            >
              <Image src={p.avatar} alt="" width={40} height={40} className="size-10 shrink-0 border border-brass-dim" />
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-semibold ${i === active ? "text-brass" : "text-ivory"}`}>{p.name}</span>
                <span className="block truncate text-sm text-ivory-dim">
                  ID {p.accountId}
                  {p.rank && ` · ${p.rank.name}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
