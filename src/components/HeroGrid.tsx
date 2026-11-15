"use client";

import { useState } from "react";
import { HeroCard } from "@/components/HeroCards";
import { SearchIcon } from "@/components/SearchForm";
import type { Hero, HeroStat } from "@/lib/api";

type Row = { stat: HeroStat; hero: Hero | undefined; name: string; rank?: number };

/** Quita tildes y mayúsculas para que "Dynamo" y "dýnamo" coincidan. */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Rejilla de héroes con buscador por nombre que filtra mientras se escribe. */
export function HeroGrid({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const needle = norm(q);
  const shown = needle ? rows.filter((r) => norm(r.name).includes(needle)) : rows;

  return (
    <>
      <div role="search" className="mt-6 max-w-md">
        <label htmlFor="hero-q" className="sr-only">
          Buscar héroe por nombre
        </label>
        <div className="flex h-12 items-stretch border border-brass bg-ox-deep transition-colors focus-within:border-ivory">
          <SearchIcon className="ml-4 w-5 shrink-0 self-center text-brass-dim" />
          <input
            id="hero-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="Buscar héroe"
            className="min-w-0 flex-1 bg-transparent px-3 text-lg text-ivory caret-brass outline-none!"
          />
        </div>
        <p className="mt-2 text-sm text-ivory-dim" aria-live="polite">
          {needle ? `${shown.length} de ${rows.length} héroes` : `${rows.length} héroes`}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 text-lg text-ivory-dim">
          Ningún héroe se llama «{q.trim()}». Revisa el nombre o borra la búsqueda.
        </p>
      ) : (
        <ol className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {shown.map((r) => (
            <HeroCard key={r.stat.heroId} stat={r.stat} hero={r.hero} rank={r.rank} />
          ))}
        </ol>
      )}
    </>
  );
}
