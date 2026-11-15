import type { IconName } from "@/components/Icons";
import type { Messages } from "@/i18n/messages";

export type Tool = {
  icon: IconName;
  href: string;
  label: string;
  description: string;
  /** Si tiene hijos, en el menú es un submenú desplegable. */
  children?: { href: string; label: string }[];
};

/** Tier list: tiene su propio desplegable en el menú global, no está entre las herramientas. */
export function tierlistMenu(t: Messages) {
  return {
    href: "/herramientas/tierlist",
    label: t.common.nav.tierlist,
    items: [
      { href: "/herramientas/tierlist", label: t.common.nav.tierlistByRank },
      { href: "/herramientas/tierlist/mia", label: t.common.nav.tierlistMine },
    ],
  };
}

/** Herramientas del menú: las usa el desplegable de la cabecera y la página /herramientas. */
export function tools(t: Messages): Tool[] {
  const x = t.common.tools;
  return [
    { icon: "map", href: "/herramientas/mapa", ...x.map },
    { icon: "radio", href: "/directo", ...x.live },
    { icon: "trophy", href: "/competitivo", ...x.competitive },
    {
      icon: "gauge",
      href: "/herramientas/rendimiento",
      ...x.performance,
      children: [{ href: "/herramientas/rendimiento/complock", label: "Complock" }],
    },
  ];
}
