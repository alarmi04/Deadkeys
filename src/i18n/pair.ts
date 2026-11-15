/** Fuerza que el texto en español y en inglés tengan exactamente la misma forma. */
export function pair<T>(es: T, en: T): { es: T; en: T } {
  return { es, en };
}
