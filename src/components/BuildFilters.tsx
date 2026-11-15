"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createContext, use, useId, useMemo, useRef, useState, useTransition } from "react";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

/* ---------- Navegación con estado de carga compartido ---------- */

const Ctx = createContext<{ pending: boolean; go: (url: string) => void }>({ pending: false, go: () => {} });

/** Envuelve filtros y resultados: mientras llega la página nueva, la actual se queda visible y atenuada. */
export function FilterScope({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const lang = useLocale();
  const [pending, start] = useTransition();
  const value = useMemo(
    () => ({ pending, go: (url: string) => start(() => router.push(localePath(lang, url), { scroll: false })) }),
    [pending, router, lang],
  );
  return <Ctx value={value}>{children}</Ctx>;
}

export function FilterResults({ children }: { children: React.ReactNode }) {
  const { pending } = use(Ctx);
  return (
    <div
      aria-busy={pending}
      className={`transition-opacity duration-200 ${pending ? "pointer-events-none opacity-45" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}

/** Enlace de filtro: funciona sin JS y, con JS, navega dentro de la transición. */
export function FilterLink({
  href,
  className,
  current,
  children,
}: {
  href: string;
  className?: string;
  current?: boolean;
  children: React.ReactNode;
}) {
  const { go } = use(Ctx);
  const lang = useLocale();
  return (
    <a
      href={localePath(lang, href)}
      aria-current={current ? "true" : undefined}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(href);
      }}
    >
      {children}
    </a>
  );
}

export function PendingNote() {
  const { pending } = use(Ctx);
  const t = useT().common;
  return (
    <span aria-live="polite" className="text-xs uppercase tracking-[0.14em] text-brass">
      {pending ? `${t.loading}…` : ""}
    </span>
  );
}

/* ---------- Buscador de héroe ---------- */

type HeroOption = { id: number; name: string; small: string };

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Campo en el que se escribe el nombre del héroe y se elige de la lista filtrada. */
export function HeroCombobox({
  heroes,
  value,
  tier,
}: {
  heroes: HeroOption[];
  value: number | null;
  tier: number | null;
}) {
  const { go } = use(Ctx);
  const t = useT().builds;
  const id = useId();
  const listId = `${id}-lista`;
  const current = heroes.find((h) => h.id === value) ?? null;
  const [text, setText] = useState(current?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const typing = open && text !== (current?.name ?? "");
  const options: (HeroOption | null)[] = useMemo(() => {
    const q = fold(text.trim());
    const list = typing && q ? heroes.filter((h) => fold(h.name).includes(q)) : heroes;
    return typing && q ? list : [null, ...list];
  }, [heroes, text, typing]);

  function choose(h: HeroOption | null) {
    setOpen(false);
    setText(h?.name ?? "");
    inputRef.current?.blur();
    if ((h?.id ?? null) === value) return;
    const q = new URLSearchParams();
    if (h) q.set("heroe", String(h.id));
    if (tier !== null) q.set("rango", String(tier));
    const s = q.toString();
    go(`/builds${s ? `?${s}` : ""}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      const d = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + d + options.length) % Math.max(options.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && options[active] !== undefined) choose(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setText(current?.name ?? "");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label htmlFor={id} className="w-16 text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">
        {t.hero}
      </label>
      <div className="relative w-full max-w-72">
        <div className="flex h-11 items-center border border-brass-dim bg-ox-deep transition-colors focus-within:border-brass hover:border-brass">
          {current && !typing && current.small && (
            <Image
              src={current.small}
              alt=""
              width={28}
              height={28}
              className="ml-2 size-7 shrink-0 object-cover object-top"
            />
          )}
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options.length > 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder={t.allHeroes}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={(e) => {
              e.currentTarget.select();
              setOpen(true);
              setActive(0);
            }}
            onBlur={() => {
              setOpen(false);
              setText(current?.name ?? "");
            }}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-ivory caret-brass outline-none!"
          />
          <svg
            viewBox="0 0 12 8"
            className="pointer-events-none mr-4 w-3 shrink-0 text-brass"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="M1 1.5 6 6.5l5-5" />
          </svg>
        </div>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t.heroes}
            className="absolute top-full right-0 left-0 z-20 mt-1 max-h-80 overflow-y-auto border border-brass bg-ox-deep shadow-[0_12px_32px_rgb(0_0_0/0.5)]"
          >
            {options.length === 0 && <li className="px-3 py-2.5 text-sm text-ivory-dim">{t.noHeroMatch}</li>}
            {options.map((h, i) => (
              <li
                key={h?.id ?? "todos"}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={(h?.id ?? null) === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(h);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 ${
                  i === active ? "bg-wine-raised text-brass" : "text-ivory"
                } ${(h?.id ?? null) === value ? "font-bold" : ""}`}
              >
                {h?.small ? (
                  <Image src={h.small} alt="" width={28} height={28} className="size-7 object-cover object-top" />
                ) : (
                  <span className="size-7" aria-hidden="true" />
                )}
                {h?.name ?? t.allHeroes}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
