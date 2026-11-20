import { unstable_cache } from "next/cache";

/** Mismos tiempos que los perfiles por defecto de `cacheLife` (revalidate, en segundos). */
const LIFE = { minutes: 60, hours: 3600, days: 86_400 } as const;

/**
 * Cachea el resultado ya procesado de una función (no la respuesta cruda de la API) entre peticiones y
 * despliegues. La clave incluye `key` y los argumentos, así que estos deben ser serializables a JSON, y
 * el resultado también (nada de Map, Set ni Date).
 */
export function cached<A extends unknown[], R>(
  key: string,
  life: keyof typeof LIFE,
  fn: (...args: A) => Promise<R>,
  tags?: string[],
): (...args: A) => Promise<R> {
  return unstable_cache(fn, [key], { revalidate: LIFE[life], tags });
}
