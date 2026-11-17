"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { useLocale, useT } from "@/i18n/client";
import { type NavMessages, buildsMenu, tierlistMenu, tools } from "@/lib/tools";

type MenuItem = { icon?: IconName; href: string; label: string; children?: { href: string; label: string }[] };

type Menu = {
  label: string;
  /** Ruta propia del menú (p. ej. /herramientas), activa solo en coincidencia exacta. */
  base?: string;
  items: MenuItem[];
  align: "left" | "right";
};

type NavEntry = { href: string; label: string } | { menu: Menu };

function buildNav(t: NavMessages): NavEntry[] {
  const n = t.common.nav;
  const tl = tierlistMenu(t);
  const bm = buildsMenu(t);
  return [
    { href: "/tracker", label: n.tracker },
    { href: "/heroes", label: n.heroes },
    { menu: { label: bm.label, items: bm.items, align: "left" } },
    { href: "/objetos", label: n.items },
    { menu: { label: tl.label, items: tl.items, align: "left" } },
    { href: "/parches", label: n.patches },
    { menu: { label: n.tools, base: "/herramientas", items: tools(t), align: "right" } },
  ];
}

const linkClass = (active: boolean) =>
  `text-sm font-semibold uppercase tracking-[0.18em] no-underline transition-colors hover:text-brass ${
    active ? "text-brass" : "text-ivory"
  }`;

/** Submenú dentro del desplegable: se abre en línea, con sus entradas sangradas. */
function SubMenu({ tool, pathname, onNavigate }: { tool: MenuItem; pathname: string; onNavigate: () => void }) {
  const inside = pathname.startsWith(tool.href);
  const [open, setOpen] = useState(inside);
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-2 ${linkClass(inside)}`}
      >
        <span className="inline-flex items-center gap-3">
          {tool.icon && <Icon name={tool.icon} size={16} />}
          {tool.label}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul className="mb-1 ml-4 border-l border-brass-dim">
          {tool.children!.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                onClick={onNavigate}
                aria-current={pathname === c.href ? "page" : undefined}
                className={`block py-1.5 pl-4 pr-4 ${linkClass(pathname === c.href)}`}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Dropdown({ menu, pathname }: { menu: Menu; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const active = pathname === menu.base || menu.items.some((i) => pathname.startsWith(i.href));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex cursor-pointer items-center gap-1.5 ${linkClass(active)}`}
      >
        {menu.label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul
          className={`absolute ${menu.align === "right" ? "right-0" : "left-0"} top-full z-20 mt-2 min-w-56 whitespace-nowrap border border-brass bg-ox-deep py-1 shadow-lg`}
        >
          {menu.items.map((i) =>
            i.children ? (
              <SubMenu key={i.href} tool={i} pathname={pathname} onNavigate={() => setOpen(false)} />
            ) : (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === i.href ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-2 ${linkClass(pathname === i.href)}`}
                >
                  {i.icon && <Icon name={i.icon} size={16} />}
                  {i.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </li>
  );
}

function usePathnameNoLang() {
  const rawPathname = usePathname();
  const lang = useLocale();
  // Las rutas del menú no llevan prefijo de idioma: se quita para comparar.
  return rawPathname.replace(new RegExp(`^/${lang}(?=/|$)`), "") || "/";
}

/** Barra de navegación de escritorio (≥1280px). En pantallas menores la sustituye MobileNav. */
export function NavLinks() {
  const pathname = usePathnameNoLang();
  const t = useT();
  return (
    <ul aria-label={t.common.nav.main} className="hidden flex-wrap gap-x-7 gap-y-1 xl:flex">
      {buildNav(t).map((n) => {
        if ("menu" in n) return <Dropdown key={n.menu.label} menu={n.menu} pathname={pathname} />;
        const active = pathname === n.href;
        return (
          <li key={n.href}>
            <Link href={n.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const rowClass = (active: boolean) =>
  `flex min-h-12 w-full items-center gap-3 px-5 text-[0.95rem] font-semibold uppercase tracking-[0.18em] no-underline transition-colors hover:text-brass ${
    active ? "text-brass" : "text-ivory"
  }`;

/** Grupo plegable del panel móvil: abierto de entrada si la página actual está dentro. */
function MobileGroup({ menu, pathname, onNavigate }: { menu: Menu; pathname: string; onNavigate: () => void }) {
  const active = pathname === menu.base || menu.items.some((i) => pathname.startsWith(i.href));
  const [open, setOpen] = useState(active);
  return (
    <li className="border-b border-brass-dim/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`cursor-pointer justify-between ${rowClass(active)}`}
      >
        {menu.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`text-brass transition-transform duration-300 ease-[var(--ease-out-expo)] ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <ul className="mb-3 ml-5 border-l border-brass-dim">
          {menu.base && (
            <li>
              <Link
                href={menu.base}
                onClick={onNavigate}
                aria-current={pathname === menu.base ? "page" : undefined}
                className={`block py-2.5 pl-4 pr-4 ${linkClass(pathname === menu.base)}`}
              >
                {menu.label}
              </Link>
            </li>
          )}
          {menu.items.map((i) =>
            i.children ? (
              <SubMenu key={i.href} tool={i} pathname={pathname} onNavigate={onNavigate} />
            ) : (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={onNavigate}
                  aria-current={pathname === i.href ? "page" : undefined}
                  className={`flex items-center gap-3 py-2.5 pl-4 pr-4 ${linkClass(pathname === i.href)}`}
                >
                  {i.icon && <Icon name={i.icon} size={16} />}
                  {i.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Menú hamburguesa para móviles y tablets (<1280px): ocupa toda la pantalla en el móvil y se abre
 * como cajón lateral a partir de 640px. Recibe el selector de idioma como hijo.
 */
export function MobileNav({ children }: { children?: ReactNode }) {
  const pathname = usePathnameNoLang();
  const t = useT();
  const n = t.common.nav;
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Si la ruta cambia con el panel abierto (enlace, botón atrás…), se cierra.
  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  const show = () => {
    setOpenedAt(pathname);
    setOpen(true);
  };
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  };
  const onNavigate = () => close(false);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      // Mantiene el foco dentro del panel mientras está abierto.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // Si la ventana crece hasta tamaño escritorio, el panel se cierra.
    const mq = window.matchMedia("(min-width: 1280px)");
    const onMq = () => {
      if (mq.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  const squareButton =
    "inline-flex size-11 cursor-pointer items-center justify-center border border-brass-dim text-brass transition-colors hover:border-brass";

  return (
    <div className="xl:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={n.openMenu}
        onClick={show}
        className={squareButton}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
        </svg>
      </button>

      {/* Velo detrás del cajón (en el móvil el panel lo tapa entero) */}
      <div
        aria-hidden="true"
        onClick={() => close()}
        className={`fixed inset-0 z-[55] bg-ox-deep/75 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label={n.main}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-brass bg-ox-deep shadow-[-12px_0_32px_rgb(0_0_0/0.45)] transition-[transform,visibility] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none sm:max-w-sm sm:border-l ${
          open ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-brass-dim px-4 py-4 sm:px-5">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-3 font-display text-[1.35rem] tracking-[0.14em] text-brass no-underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={32} height={32} className="size-8" />
            DEADKEYS
          </Link>
          <button ref={closeRef} type="button" aria-label={n.closeMenu} onClick={() => close()} className={squareButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          <ul>
            {buildNav(t).map((entry) => {
              if ("menu" in entry)
                return <MobileGroup key={entry.menu.label} menu={entry.menu} pathname={pathname} onNavigate={onNavigate} />;
              const active = pathname === entry.href;
              return (
                <li key={entry.href} className="border-b border-brass-dim/40">
                  <Link href={entry.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={rowClass(active)}>
                    {entry.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {children && (
          <div className="flex items-center justify-between gap-4 border-t border-brass-dim px-5 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ivory-dim">{t.common.language}</span>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
