"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { localePath } from "@/i18n/config";
import { useFormat, useLocale, useT } from "@/i18n/client";

export type ArenaHero = {
  id: number;
  name: string;
  color: string;
  card: string;
  gloat: string;
  vertical: string;
  background: string;
  nameImage: string;
};

type Side = "a" | "b";

/**
 * Pantalla de versus: un escenario por lado, el VS en medio y un carrusel de retratos bajo cada
 * escenario. Pasar el ratón (o el foco) por un retrato lo muestra en su lado; hacer clic lo elige
 * y lo guarda en la URL, que es lo que pide los resultados al servidor.
 */
export function MatchupArena({
  heroes,
  a,
  b,
  split,
  children,
}: {
  heroes: ArenaHero[];
  a: number | null;
  b: number | null;
  /** % de victorias de `a` contra `b`, si los dos están elegidos y hay partidas. */
  split: number | null;
  children?: React.ReactNode;
}) {
  const t = useT().matchup;
  const lang = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Record<Side, number | null>>({ a: null, b: null });
  // Lo elegido se refleja al instante, sin esperar a que el servidor responda.
  const [picked, setPicked] = useState<Record<Side, number | null>>({ a, b });
  // Si la URL cambia por otro camino (atrás/adelante), manda la URL.
  const [fromUrl, setFromUrl] = useState({ a, b });
  if (fromUrl.a !== a || fromUrl.b !== b) {
    setFromUrl({ a, b });
    setPicked({ a, b });
  }

  const byId = new Map(heroes.map((h) => [h.id, h]));
  const go = (next: Record<Side, number | null>) => {
    setPicked(next);
    const qs = new URLSearchParams();
    if (next.a !== null) qs.set("a", String(next.a));
    if (next.b !== null) qs.set("b", String(next.b));
    const q = qs.toString();
    startTransition(() => {
      router.replace(localePath(lang, `/herramientas/enfrentamiento${q ? `?${q}` : ""}`), { scroll: false });
    });
  };
  const pick = (side: Side, id: number) => {
    setPreview((p) => ({ ...p, [side]: null }));
    go({ ...picked, [side]: id });
  };
  const both = picked.a !== null && picked.b !== null;
  const settled = both && picked.a === a && picked.b === b;

  return (
    <>
      <div className="duel-arena duel-wrap" data-pending={pending || undefined}>
        {(["a", "b"] as const).map((side) => {
          const shownId = preview[side] ?? picked[side];
          return (
            <Stage
              key={side}
              side={side}
              label={t.sides[side]}
              hero={shownId !== null ? (byId.get(shownId) ?? null) : null}
              locked={shownId !== null && shownId === picked[side]}
            />
          );
        })}

        <div className="duel-vs">
          <span key={both ? `${picked.a}-${picked.b}` : "idle"} className="duel-vs-mark" data-live={both || undefined} aria-hidden="true">
            VS
          </span>
          {settled && split !== null && byId.get(a!) && byId.get(b!) && (
            <Split a={byId.get(a!)!} b={byId.get(b!)!} winRate={split} />
          )}
          {(picked.a !== null || picked.b !== null) && (
            <button
              type="button"
              onClick={() => go({ a: picked.b, b: picked.a })}
              className="duel-swap"
            >
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                <path d="M3 7h12l-3.5-3.5M17 13H5l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              {t.swap}
            </button>
          )}
        </div>

        {(["a", "b"] as const).map((side) => (
          <Carousel
            key={side}
            side={side}
            label={t.sides[side]}
            heroes={heroes}
            picked={picked[side]}
            onPreview={(id) => setPreview((p) => ({ ...p, [side]: id }))}
            onPick={(id) => pick(side, id)}
          />
        ))}
      </div>

      {!both && <p className="mx-auto mt-6 max-w-[64ch] px-4 text-center text-ivory-dim">{t.howTo}</p>}

      {both && (
        <div className="transition-opacity duration-300" style={{ opacity: settled ? 1 : 0.35 }} aria-busy={!settled}>
          {children}
        </div>
      )}
    </>
  );
}

function Stage({ side, label, hero, locked }: { side: Side; label: string; hero: ArenaHero | null; locked: boolean }) {
  const t = useT().matchup;
  const art = hero ? (locked && hero.gloat ? hero.gloat : hero.card) : "";
  return (
    <section
      aria-label={label}
      className="duel-stage"
      data-side={side}
      data-empty={!hero || undefined}
      style={{ "--hero": hero?.color ?? "var(--wine-raised)" } as React.CSSProperties}
    >
      <div aria-hidden="true" className="duel-stage-slab" />
      {hero?.background && (
        <div key={`bg-${hero.id}`} aria-hidden="true" className="duel-stage-bg">
          <Image src={hero.background} alt="" fill sizes="50vw" className="object-cover object-right" />
        </div>
      )}

      <p className="duel-stage-label">
        {label}
        {hero && !locked && <span className="text-ivory-dim"> · {t.previewing}</span>}
      </p>

      <div key={hero ? `${hero.id}-${locked}` : "empty"} className="duel-figure" data-locked={locked || undefined}>
        <div className="deco-frame duel-frame">
          {art ? (
            <Image src={art} alt="" fill unoptimized className="duel-art object-cover object-top" />
          ) : (
            <span aria-hidden="true" className="duel-unknown">
              ?
            </span>
          )}
        </div>
      </div>

      <h2 className="duel-name">
        {hero ? (
          hero.nameImage ? (
            <Image src={hero.nameImage} alt={hero.name} width={1449} height={353} unoptimized className="duel-name-img" />
          ) : (
            <span className="font-barlow text-5xl font-extrabold uppercase">{hero.name}</span>
          )
        ) : (
          <span className="font-barlow text-2xl font-bold uppercase tracking-[0.06em] text-ivory-dim">{t.empty}</span>
        )}
      </h2>
    </section>
  );
}

function Split({ a, b, winRate }: { a: ArenaHero; b: ArenaHero; winRate: number }) {
  const t = useT().matchup;
  const { pct } = useFormat();
  return (
    <figure className="duel-split" aria-label={t.splitAria(a.name, pct(winRate), b.name, pct(1 - winRate))}>
      <div aria-hidden="true" className="flex justify-between font-barlow text-xl font-extrabold leading-none text-ivory">
        <span>{pct(winRate)}</span>
        <span>{pct(1 - winRate)}</span>
      </div>
      <div aria-hidden="true" className="duel-split-bar">
        <span style={{ width: `${winRate * 100}%`, background: a.color }} />
        <span style={{ background: b.color }} />
      </div>
    </figure>
  );
}

function Carousel({
  side,
  label,
  heroes,
  picked,
  onPreview,
  onPick,
}: {
  side: Side;
  label: string;
  heroes: ArenaHero[];
  picked: number | null;
  onPreview: (id: number | null) => void;
  onPick: (id: number) => void;
}) {
  const t = useT().matchup;
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = () => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };

  // Al cargar, el héroe elegido queda a la vista (solo se mueve el carrusel, nunca la página).
  useEffect(() => {
    const el = track.current;
    const on = el?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (el && on) el.scrollLeft = on.offsetLeft - el.clientWidth / 2 + on.offsetWidth / 2;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // Solo al montar: luego el usuario manda sobre el desplazamiento.
  }, []);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="duel-carousel" data-side={side} onMouseLeave={() => onPreview(null)}>
      <button type="button" className="duel-arrow" onClick={() => page(-1)} disabled={edges.start} aria-label={t.prev}>
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <ul ref={track} className="duel-track" aria-label={t.carouselAria(label)} onScroll={measure}>
        {heroes.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              aria-pressed={h.id === picked}
              aria-label={h.name}
              title={h.name}
              data-on={h.id === picked || undefined}
              onMouseEnter={() => onPreview(h.id)}
              onFocus={() => onPreview(h.id)}
              onBlur={() => onPreview(null)}
              onClick={() => onPick(h.id)}
              className="hero-tile duel-tile group"
              style={{ "--hero": h.color } as React.CSSProperties}
            >
              {h.vertical && (
                <Image
                  src={h.vertical}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover transition-[filter] duration-200 group-hover:brightness-110"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="duel-arrow" onClick={() => page(1)} disabled={edges.end} aria-label={t.next}>
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
