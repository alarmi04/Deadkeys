"use client";

import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import { useLocale, useT } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { buildsMenu, tierlistMenu, tools } from "@/lib/tools";

type MenuItem = { icon?: IconName; href: string; label: string; children?: { href: string; label: string }[] };

type Menu = {
  label: string;
  /** Ruta propia del menú (p. ej. /herramientas), activa solo en coincidencia exacta. */
  base?: string;
  items: MenuItem[];
  align: "left" | "right";
};

type NavEntry = { href: string; label: string } | { menu: Menu };

function buildNav(t: Messages): NavEntry[] {
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

export function NavLinks() {
  const rawPathname = usePathname();
  const lang = useLocale();
  const t = useT();
  // Las rutas del menú no llevan prefijo de idioma: se quita para comparar.
  const pathname = rawPathname.replace(new RegExp(`^/${lang}(?=/|$)`), "") || "/";
  return (
    <ul aria-label={t.common.nav.main} className="flex flex-wrap gap-x-7 gap-y-1">
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
