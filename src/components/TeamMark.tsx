export type Lang = "es" | "en";

/** Nombres de los equipos como los llama el juego. Equipo 0 = Rey Oculto / Hidden King, equipo 1 = Archimadre / Archmother. */
export const TEAM_NAMES: Record<Lang, readonly [string, string]> = {
  es: ["Rey Oculto", "Archimadre"],
  en: ["Hidden King", "Archmother"],
};
export const TEAM_NAME = TEAM_NAMES.es;

/** Color con el que se pinta cada equipo. */
const COLOR = ["#ffaf35", "#6f9bf2"] as const;

/** Nombre del equipo en la tipografía de la web, teñido del color del equipo. `height` es la altura de la línea. */
export function TeamMark({ team, lang = "es", height = 52 }: { team: 0 | 1; lang?: Lang; height?: number }) {
  return (
    <span
      className="inline-block shrink-0 whitespace-nowrap align-middle font-display uppercase leading-none tracking-[0.1em]"
      style={{
        fontSize: height * 0.6,
        lineHeight: `${height}px`,
        color: COLOR[team],
        textShadow: `0 0 10px ${COLOR[team]}55`,
      }}
    >
      {TEAM_NAMES[lang][team]}
    </span>
  );
}
