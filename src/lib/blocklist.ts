/*
 * Lista de jugadores que han pedido no aparecer en DeadKeys.
 *
 * Se gestiona desde /es/admin. Se guarda en Upstash Redis (en Vercel: Storage → Upstash Redis, que crea
 * UPSTASH_REDIS_REST_URL/TOKEN o KV_REST_API_URL/TOKEN). Sin Redis, en desarrollo, usa .data/blocklist.json.
 * Además se puede fijar una lista fija con la variable privada BLOCKED_ACCOUNT_IDS (IDs separados por comas).
 */
import { cacheLife, cacheTag } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";

export type BlockEntry = { id: number; name: string | null; note: string | null; addedAt: string };

export const BLOCKLIST_TAG = "blocklist";
const KEY = "deadkeys:blocklist";
const FILE = path.join(process.cwd(), ".data", "blocklist.json");

// SteamID64 = 76561197960265728 + ID de cuenta (cabe en un número seguro de JS).
const STEAM64_BASE = 76561197960265728;

/** Acepta un ID de cuenta de Deadlock o un SteamID64 y devuelve el ID de cuenta, o null si no es válido. */
export function parseAccountId(raw: string): number | null {
  const part = raw.trim();
  if (!/^\d+$/.test(part)) return null;
  const n = Number(part);
  const id = n >= STEAM64_BASE ? n - STEAM64_BASE : n;
  return Number.isSafeInteger(id) && id > 0 && id <= 0xffffffff ? id : null;
}

function fromEnv(): number[] {
  return (process.env.BLOCKED_ACCOUNT_IDS ?? "")
    .split(/[\s,;]+/)
    .map(parseAccountId)
    .filter((n): n is number => n !== null);
}

/* ---------- Almacenamiento ---------- */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const storageKind = (): "redis" | "file" => (REDIS_URL && REDIS_TOKEN ? "redis" : "file");

export async function redis(command: (string | number)[]): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis no configurado");
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || json.error) throw new Error(json.error ?? `Redis ${res.status}`);
  return json.result;
}

function sanitize(list: unknown): BlockEntry[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((e) =>
    e && typeof e.id === "number"
      ? [{ id: e.id, name: e.name ?? null, note: e.note ?? null, addedAt: String(e.addedAt ?? "") }]
      : [],
  );
}

/** Lista guardada, sin caché (para el panel de administración). */
export async function readEntries(): Promise<BlockEntry[]> {
  if (storageKind() === "redis") {
    const raw = await redis(["GET", KEY]);
    return typeof raw === "string" ? sanitize(JSON.parse(raw)) : [];
  }
  try {
    return sanitize(JSON.parse(await fs.readFile(FILE, "utf8")));
  } catch {
    return [];
  }
}

export async function writeEntries(entries: BlockEntry[]): Promise<void> {
  if (storageKind() === "redis") {
    await redis(["SET", KEY, JSON.stringify(entries)]);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(entries, null, 2), "utf8");
}

/** Conjunto de IDs bloqueados (lista guardada + variable de entorno). Se invalida al guardar cambios. */
export async function getBlockedSet(): Promise<Set<number>> {
  "use cache";
  cacheTag(BLOCKLIST_TAG);
  cacheLife("minutes");
  const set = new Set<number>(fromEnv());
  try {
    for (const e of await readEntries()) set.add(e.id);
  } catch {
    // Si el almacenamiento falla, se mantiene al menos la lista fija del entorno.
  }
  return set;
}

/* ---------- Jugadores ocultos en partidas ---------- */

/** Marca de un jugador oculto en partidas: ID negativo, único dentro de la partida. */
export const hiddenId = (index: number): number => -(index + 1);
export const isHiddenId = (accountId: number): boolean => accountId < 0;
