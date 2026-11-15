/*
 * Acceso al panel de administración (/es/admin).
 *   ADMIN_PASSWORD  contraseña (obligatoria, mínimo 8 caracteres; sin ella el panel queda desactivado)
 *   ADMIN_SECRET    clave aleatoria para firmar la sesión (muy recomendada; si falta se deriva de la contraseña)
 * La sesión es una cookie httpOnly firmada con caducidad de 8 horas. Cerrar sesión invalida en el servidor
 * todas las sesiones emitidas hasta ese momento (compartido entre instancias si hay Redis).
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redis, storageKind } from "@/lib/blocklist";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const COOKIE = "dk_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;
const LOGIN_BUCKET = "admin-login";
const REVOKED_KEY = "deadkeys:admin:revoked-before";

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const SECRET = process.env.ADMIN_SECRET || createHash("sha256").update(`deadkeys-admin-session:${PASSWORD}`).digest("hex");

export const adminConfigured = (): boolean => PASSWORD.length >= 8;
export const adminSecretConfigured = (): boolean => (process.env.ADMIN_SECRET ?? "").length >= 32;

const sha = (v: string) => createHash("sha256").update(v).digest();
const sign = (v: string) => createHmac("sha256", SECRET).update(v).digest("hex");

export function passwordMatches(input: string): boolean {
  return adminConfigured() && timingSafeEqual(sha(input), sha(PASSWORD));
}

/* ---------- Revocación de sesiones ---------- */

let revokedBeforeMemory = 0;

async function revokedBefore(): Promise<number> {
  if (storageKind() === "redis") {
    try {
      return Math.max(revokedBeforeMemory, Number(await redis(["GET", REVOKED_KEY])) || 0);
    } catch {
      // Si Redis falla, se usa el valor en memoria.
    }
  }
  return revokedBeforeMemory;
}

async function revokeAll(): Promise<void> {
  revokedBeforeMemory = Date.now();
  if (storageKind() === "redis") {
    await redis(["SET", REVOKED_KEY, revokedBeforeMemory, "EX", SESSION_SECONDS]).catch(() => {});
  }
}

/* ---------- Sesión ---------- */

// Formato: <emitida en ms>.<caduca en s>.<firma>
async function tokenValid(token: string | undefined): Promise<boolean> {
  if (!adminConfigured() || !token) return false;
  const [iat, exp, mac] = token.split(".");
  if (!iat || !exp || !mac || Number(exp) < Date.now() / 1000) return false;
  const expected = sign(`${iat}.${exp}`);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  return Number(iat) > (await revokedBefore());
}

export async function isAdmin(): Promise<boolean> {
  return tokenValid((await cookies()).get(COOKIE)?.value);
}

export async function startSession(): Promise<void> {
  const iat = String(Date.now());
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  (await cookies()).set(COOKIE, `${iat}.${exp}.${sign(`${iat}.${exp}`)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

/** Cierra la sesión actual e invalida todas las emitidas hasta ahora (por si alguna se hubiera filtrado). */
export async function endSession(): Promise<void> {
  if (await isAdmin()) await revokeAll();
  (await cookies()).delete(COOKIE);
}

/* ---------- Límite de intentos de acceso, por IP ---------- */

/** Cuenta un intento de acceso y dice si aún está permitido. */
export const registerAttempt = (): Promise<boolean> => rateLimit(LOGIN_BUCKET, MAX_ATTEMPTS, WINDOW_SECONDS);

export const clearAttempts = (): Promise<void> => resetRateLimit(LOGIN_BUCKET);
