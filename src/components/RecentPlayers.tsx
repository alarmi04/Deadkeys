"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";

const KEY = "deadkey.tracker.recent";
const MAX = 8;

export type Recent = { id: number; name: string; avatar: string | null };

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("deadkey:recent", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("deadkey:recent", cb);
  };
}

function parse(raw: string): Recent[] {
  try {
    const list: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(list)) return [];
    return list.filter(
      (r): r is Recent => !!r && typeof r.id === "number" && typeof r.name === "string",
    );
  } catch {
    return [];
  }
}

/** Apunta al jugador visto en el almacenamiento local, el último primero. No se envía a ningún servidor. */
export function RememberPlayer({ player }: { player: Recent }) {
  const { id, name, avatar } = player;
  useEffect(() => {
    try {
      const next = [{ id, name, avatar }, ...parse(read()).filter((r) => r.id !== id)].slice(0, MAX);
      window.localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("deadkey:recent"));
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): simplemente no hay recientes.
    }
  }, [id, name, avatar]);
  return null;
}

/** Accesos rápidos a los últimos jugadores consultados para rellenar un hueco con un clic. */
export function RecentPlayers({
  slot,
  others,
  exclude,
}: {
  slot: "a" | "b";
  /** Resto de parámetros de la URL, para conservarlos al elegir. */
  others: Record<string, string>;
  exclude: number[];
}) {
  const t = useT().players.recent;
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const recents = useMemo(() => parse(raw).filter((r) => !exclude.includes(r.id)), [raw, exclude]);
  if (recents.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ivory-dim">{t.title}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {recents.map((r) => (
          <li key={r.id}>
            <Link
              href={`/tracker?${new URLSearchParams({ ...others, [slot]: String(r.id) })}`}
              scroll={false}
              className="flex max-w-[14rem] items-center gap-2 border border-brass-dim py-1 pl-1 pr-3 no-underline transition-colors hover:border-brass hover:bg-wine/50"
            >
              {r.avatar ? (
                <Image src={r.avatar} alt="" width={28} height={28} className="size-7 shrink-0" />
              ) : (
                <span className="size-7 shrink-0 bg-wine" aria-hidden="true" />
              )}
              <span className="truncate text-sm font-semibold">{r.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
