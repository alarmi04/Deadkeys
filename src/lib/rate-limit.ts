/*
 * Límite de peticiones por IP en ventana fija. Usa Upstash Redis si está configurado (compartido entre
 * instancias) y, si no o si falla, un contador en memoria (por instancia).
 */
import { headers } from "next/headers";
import { redis, storageKind } from "@/lib/blocklist";

const memory = new Map<string, { count: number; reset: number }>();

/** IP del cliente. En Vercel, x-real-ip y x-forwarded-for los fija la plataforma y no se pueden falsear. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") || (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

function memoryHit(key: string, windowSeconds: number): number {
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.reset < now) {
    // Limpieza ocasional para que el mapa no crezca sin límite.
    if (memory.size > 10_000) for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
    memory.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return 1;
  }
  return ++cur.count;
}

/** Cuenta una petición para `bucket` y dice si aún está dentro del límite. */
export async function rateLimit(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = `deadkeys:rl:${bucket}:${await clientIp()}`;
  if (storageKind() === "redis") {
    try {
      const n = Number(await redis(["INCR", key]));
      if (n === 1) await redis(["EXPIRE", key, windowSeconds]);
      return n <= max;
    } catch {
      // Si Redis falla, se usa el contador en memoria.
    }
  }
  return memoryHit(key, windowSeconds) <= max;
}

/** Reinicia el contador de `bucket` para la IP actual. */
export async function resetRateLimit(bucket: string): Promise<void> {
  const key = `deadkeys:rl:${bucket}:${await clientIp()}`;
  memory.delete(key);
  if (storageKind() === "redis") await redis(["DEL", key]).catch(() => {});
}

/** Respuesta 429 estándar para las rutas de la API. */
export const tooManyRequests = (retryAfter: number) =>
  Response.json({ error: "Demasiadas peticiones" }, { status: 429, headers: { "retry-after": String(retryAfter) } });
