"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { clearAttempts, endSession, isAdmin, passwordMatches, registerAttempt, startSession } from "@/lib/admin-auth";
import { getSteamProfilesRaw } from "@/lib/api";
import { BLOCKLIST_TAG, readEntries, writeEntries } from "@/lib/blocklist";
import { defaultLocale, isLocale, localePath } from "@/i18n/config";
import type { AdminError, AdminOk } from "./messages";

function back(formData: FormData, query = ""): never {
  const raw = String(formData.get("lang") ?? "");
  const lang = isLocale(raw) ? raw : defaultLocale;
  redirect(`${localePath(lang, "/admin")}${query}`);
}

// Solo códigos fijos en la URL: el panel traduce cada uno a su texto (evita mensajes inyectados por enlace).
const ok = (code: AdminOk, id?: number) => `?ok=${code}${id ? `&id=${id}` : ""}`;
const err = (code: AdminError) => `?err=${code}`;

export async function login(formData: FormData) {
  if (!(await registerAttempt())) back(formData, err("throttled"));
  if (!passwordMatches(String(formData.get("password") ?? ""))) back(formData, err("password"));
  await clearAttempts();
  await startSession();
  back(formData);
}

export async function logout(formData: FormData) {
  await endSession();
  back(formData);
}

export async function block(formData: FormData) {
  if (!(await isAdmin())) back(formData, err("session"));
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0 || id > 0xffffffff) back(formData, err("id"));

  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  let name = String(formData.get("name") ?? "").trim().slice(0, 100) || null;
  if (!name) name = (await getSteamProfilesRaw([id]).catch(() => null))?.[id]?.name ?? null;

  try {
    const entries = await readEntries();
    if (!entries.some((e) => e.id === id)) {
      await writeEntries([...entries, { id, name, note, addedAt: new Date().toISOString() }]);
    }
  } catch (e) {
    console.error("[admin] No se pudo guardar la lista de bloqueo", e);
    back(formData, err("save"));
  }
  updateTag(BLOCKLIST_TAG);
  back(formData, ok("blocked", id));
}

export async function unblock(formData: FormData) {
  if (!(await isAdmin())) back(formData, err("session"));
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) back(formData, err("id"));
  try {
    await writeEntries((await readEntries()).filter((e) => e.id !== id));
  } catch (e) {
    console.error("[admin] No se pudo guardar la lista de bloqueo", e);
    back(formData, err("save"));
  }
  updateTag(BLOCKLIST_TAG);
  back(formData, ok("unblocked"));
}
