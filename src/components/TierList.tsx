"use client";

import Image from "next/image";
import Link from "@/components/Link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { MAX_ROWS, type Row, STORAGE_KEY, decodeRows, encodeRows, tierTone } from "@/lib/tierlist";

export type EditorHero = { id: number; name: string; image: string };

const DEFAULT_LABELS = ["S", "A", "B", "C", "D"];

const emptyRows = (labels = DEFAULT_LABELS): Row[] => labels.map((label) => ({ label, heroes: [] }));

function loadSaved(known: Set<number>): Row[] | null {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  if (hash.startsWith("#t=")) return decodeRows(hash.slice(3), known);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? decodeRows(raw, known) : null;
  } catch {
    return null;
  }
}

/** `seed` es una plantilla recibida por la URL (desde «Por rango»); sin ella se carga lo guardado en el navegador. */
export function TierList({ heroes, seed = null }: { heroes: EditorHero[]; seed?: Row[] | null }) {
  const tr = useT().tierlist;
  const tc = tr;
  const t = tr.editor;
  const byId = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const known = useMemo(() => new Set(heroes.map((h) => h.id)), [heroes]);

  const [rows, setRows] = useState<Row[]>(() => seed ?? emptyRows());
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | "pool" | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // La tier list guardada (o la del enlace) solo existe en el navegador: se carga tras montar.
  useEffect(() => {
    if (seed) {
      // La plantilla ya es el estado inicial. Se limpia la URL para que recargar no la vuelva a aplicar encima de
      // lo que el usuario cambie después; al marcar `loaded` se guarda como su tier list.
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      const saved = loadSaved(known);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dato que solo existe en el cliente
      if (saved) setRows(saved);
    }
    setLoaded(true);
    // Un enlace compartido abierto en la misma pestaña solo cambia el hash.
    const onHash = () => {
      const shared = window.location.hash.startsWith("#t=") ? decodeRows(window.location.hash.slice(3), known) : null;
      if (shared) setRows(shared);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [known, seed]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, encodeRows(rows));
    } catch {
      // Sin almacenamiento (modo privado): la tier list sigue funcionando, solo no se recuerda.
    }
  }, [rows, loaded]);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const placed = new Set(rows.flatMap((r) => r.heroes));
  const pool = heroes.filter((h) => !placed.has(h.id)).sort((a, b) => a.name.localeCompare(b.name, "es"));

  /** Mueve un héroe a una fila (o al banquillo con row = null), opcionalmente delante de otro. */
  const move = (id: number, row: number | null, before?: number) => {
    setRows((rs) => {
      const next = rs.map((r) => ({ ...r, heroes: r.heroes.filter((h) => h !== id) }));
      if (row !== null) {
        const list = next[row].heroes;
        const at = before !== undefined ? list.indexOf(before) : -1;
        if (at >= 0) list.splice(at, 0, id);
        else list.push(id);
      }
      return next;
    });
    setSelected(null);
  };

  const rowOf = (id: number) => rows.findIndex((r) => r.heroes.includes(id));

  const onTileClick = (id: number) => {
    if (selected === null) return setSelected(id);
    if (selected === id) return setSelected(null);
    // Con un héroe elegido, pulsar otro lo coloca delante de este.
    const row = rowOf(id);
    if (row >= 0) move(selected, row, id);
    else if (rowOf(selected) >= 0) move(selected, null);
    else setSelected(id);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#t=${encodeRows(rows)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(t.promptCopy, url);
    }
  };

  const reset = () => {
    setRows((rs) => emptyRows(rs.map((r) => r.label)));
    setSelected(null);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  };

  const tile = (id: number, row: number | null) => {
    const h = byId.get(id);
    if (!h) return null;
    const on = selected === id;
    return (
      <li
        key={id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", String(id));
          e.dataTransfer.effectAllowed = "move";
          setDragging(id);
          setSelected(null);
        }}
        onDragEnd={() => {
          setDragging(null);
          setOver(null);
        }}
        onDragOver={(e) => {
          if (dragging === null || row === null) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(row);
        }}
        onDrop={(e) => {
          if (dragging === null || row === null) return;
          e.preventDefault();
          e.stopPropagation();
          if (dragging !== id) move(dragging, row, id);
          setDragging(null);
          setOver(null);
        }}
        className="tier-tile"
        data-on={on || undefined}
        data-dragging={dragging === id || undefined}
      >
        <button type="button" onClick={() => onTileClick(id)} aria-pressed={on} aria-label={h.name} title={h.name}>
          {h.image ? (
            <Image src={h.image} alt="" width={68} height={68} draggable={false} />
          ) : (
            <span className="block size-full bg-wine" />
          )}
        </button>
      </li>
    );
  };

  const dropZone = (row: number | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragging === null) return;
      e.preventDefault();
      setOver(row ?? "pool");
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = Number(e.dataTransfer.getData("text/plain"));
      if (known.has(id)) move(id, row);
      setDragging(null);
      setOver(null);
    },
  });

  const selectedName = selected !== null ? byId.get(selected)?.name : null;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <button type="button" className="tier-btn tier-btn-primary" onClick={share}>
          {copied ? t.linkCopied : t.copyLink}
        </button>
        <button type="button" className="tier-btn" onClick={reset}>
          {t.reset}
        </button>
        {rows.length < MAX_ROWS && (
          <button
            type="button"
            className="tier-btn"
            onClick={() => setRows((rs) => [...rs, { label: String.fromCharCode(65 + rs.length), heroes: [] }])}
          >
            {t.addRow}
          </button>
        )}
      </div>
      <p className="mt-3 max-w-[78ch] text-sm text-ivory-dim">
        {t.startFromData}{" "}
        <Link href="/herramientas/tierlist" className="text-brass underline">
          {t.viewByRank}
        </Link>{" "}
        {t.pressUseAsBase}
      </p>

      <p className="tier-hint" aria-live="polite" data-on={selectedName ? true : undefined}>
        {selectedName ? (
          <>
            <b className="text-ivory">{selectedName}</b>
            {t.selectedHint}{" "}
            <button type="button" onClick={() => setSelected(null)} className="text-brass underline">
              {tc.cancel}
            </button>
          </>
        ) : (
          t.defaultHint
        )}
      </p>

      <ol className="tier-board" aria-label={t.boardAria}>
        {rows.map((r, i) => (
          <li key={i} className="tier-row" data-over={over === i || undefined} {...dropZone(i)}>
            <div className="tier-label" style={tierTone(i, rows.length)}>
              <input
                value={r.label}
                maxLength={12}
                onChange={(e) => {
                  const label = e.target.value;
                  setRows((rs) => rs.map((x, j) => (j === i ? { ...x, label } : x)));
                }}
                aria-label={t.rowName(i + 1)}
                style={{ fontSize: r.label.length > 3 ? "1.05rem" : undefined }}
              />
            </div>
            <ul className="tier-heroes" aria-label={tr.rowAria(r.label || String(i + 1))}>
              {r.heroes.map((id) => tile(id, i))}
              {selected !== null && rowOf(selected) !== i && (
                <li>
                  <button type="button" className="tier-place" onClick={() => move(selected, i)}>
                    {t.place}
                  </button>
                </li>
              )}
            </ul>
            {rows.length > 1 && (
              <button
                type="button"
                className="tier-remove"
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                aria-label={t.removeRow(r.label || String(i + 1), r.heroes.length > 0)}
                title={t.removeRowTitle}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ol>

      <section
        className="tier-pool"
        data-over={over === "pool" || undefined}
        aria-labelledby="banquillo"
        {...dropZone(null)}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="banquillo" className="text-sm font-semibold uppercase tracking-[0.16em] text-ivory-dim">
            {t.unranked(pool.length)}
          </h2>
          {selected !== null && rowOf(selected) >= 0 && (
            <button type="button" className="tier-place" onClick={() => move(selected, null)}>
              {t.giveBack}
            </button>
          )}
        </div>
        {pool.length > 0 ? (
          <ul className="tier-heroes mt-3">{pool.map((h) => tile(h.id, null))}</ul>
        ) : (
          <p className="mt-3 text-ivory-dim">{t.allRanked}</p>
        )}
      </section>
    </div>
  );
}
