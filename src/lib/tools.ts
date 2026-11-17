import type { IconName } from "@/components/Icons";
import type { Messages } from "@/i18n/messages";

/** Solo hace falta la sección común: así sirve tanto con los textos del servidor como con los de cliente. */
export type NavMessages = Pick<Messages, "common">;

export type Tool = {
  icon: IconName;
  href: string;
  label: string;
  description: string;
  /** Si tiene hijos, en el menú es un submenú desplegable. */
  children?: { href: string; label: string }[];
};

/** Tier list: tiene su propio desplegable en el menú global, no está entre las herramientas. */
export function tierlistMenu(t: NavMessages) {
  return {
    href: "/herramientas/tierlist",
    label: t.common.nav.tierlist,
    items: [
      { href: "/herramientas/tierlist", label: t.common.nav.tierlistByRank },
      { href: "/herramientas/tierlist/mia", label: t.common.nav.tierlistMine },
    ],
  };
}

/** Builds: desplegable propio con las builds de la comunidad y el enfrentamiento entre dos héroes. */
export function buildsMenu(t: NavMessages) {
  return {
    label: t.common.nav.builds,
    items: [
      { href: "/builds", label: t.common.nav.builds },
      { href: "/herramientas/enfrentamiento", label: t.common.tools.matchup.label },
    ],
  };
}

/** Herramientas del menú: las usa el desplegable de la cabecera y la página /herramientas. */
export function tools(t: NavMessages): Tool[] {
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
