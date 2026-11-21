/*
 * Límite de peticiones por IP.
 *
 * En Cloudflare Workers se usa el Rate Limiting nativo (bindings `RL_*` de wrangler.jsonc): el contador se
 * comparte entre todas las instancias del Worker de cada ubicación. Solo admite ventanas de 10 o 60 s, así
 * que además se lleva un contador propio con la ventana pedida: en Upstash Redis si está configurado o, si
 * no, en memoria (por instancia; en Workers solo sirve de refuerzo). Se exige pasar los dos.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { redis, storageKind } from "@/lib/blocklist";

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

/** Bucket → binding de wrangler.jsonc. Los límites y ventanas de cada binding se fijan allí. */
const BINDINGS: Record<string, string> = {
  search: "RL_SEARCH",
  "build-items": "RL_BUILD_ITEMS",
  "admin-login": "RL_ADMIN_LOGIN",
};

const memory = new Map<string, { count: number; reset: number }>();

/**
 * IP del cliente. En Cloudflare, `cf-connecting-ip` la fija la plataforma y el cliente no la puede falsear;
 * `x-real-ip` y el primer valor de `x-forwarded-for` sí los controla el cliente, así que solo se usan fuera
 * de Cloudflare (desarrollo local).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") || h.get("x-real-ip") || (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown"
  );
}

/** Binding de Rate Limiting del Worker para `bucket`, o null fuera de Workers (p. ej. `next dev`). */
function workerLimiter(bucket: string): Limiter | null {
  const name = BINDINGS[bucket];
  if (!name) return null;
  try {
    const env = getCloudflareContext().env as unknown as Record<string, Limiter | undefined>;
    return env[name] ?? null;
  } catch {
    return null;
  }
}

/** Pasa la petición por el binding del Worker. Si no existe o falla, no bloquea (queda el otro contador). */
async function workerHit(bucket: string, ip: string): Promise<boolean> {
  const limiter = workerLimiter(bucket);
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key: ip })).success;
  } catch (e) {
    console.error(`Rate limit ${bucket} fallido: ${e instanceof Error ? e.message : String(e)}`);
    return true;
  }
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

/** Contador propio con la ventana pedida: Redis si está configurado, si no en memoria. */
async function counterHit(key: string, windowSeconds: number): Promise<number> {
  if (storageKind() === "redis") {
    try {
      const n = Number(await redis(["INCR", key]));
      if (n === 1) await redis(["EXPIRE", key, windowSeconds]);
      return n;
    } catch {
      // Si Redis falla, se usa el contador en memoria.
    }
  }
  return memoryHit(key, windowSeconds);
}

/** Cuenta una petición para `bucket` y dice si aún está dentro del límite. */
export async function rateLimit(bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  const ip = await clientIp();
  const [shared, count] = await Promise.all([workerHit(bucket, ip), counterHit(`deadkeys:rl:${bucket}:${ip}`, windowSeconds)]);
  return shared && count <= max;
}

/** Reinicia el contador propio de `bucket` para la IP actual (el del Worker no se puede reiniciar). */
export async function resetRateLimit(bucket: string): Promise<void> {
  const key = `deadkeys:rl:${bucket}:${await clientIp()}`;
  memory.delete(key);
  if (storageKind() === "redis") await redis(["DEL", key]).catch(() => {});
}

/** Respuesta 429 estándar para las rutas de la API. */
export const tooManyRequests = (retryAfter: number) =>
  Response.json({ error: "Demasiadas peticiones" }, { status: 429, headers: { "retry-after": String(retryAfter) } });
