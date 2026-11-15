import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Spinner";
import { adminConfigured, adminSecretConfigured, isAdmin } from "@/lib/admin-auth";
import { getSteamProfilesRaw, searchPlayersRaw, type SteamProfile } from "@/lib/api";
import { parseAccountId, readEntries, storageKind } from "@/lib/blocklist";
import { block, login, logout, unblock } from "./actions";
import { errorText, okText } from "./messages";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false, nocache: true },
};

const input = "w-full border border-brass-dim bg-transparent px-3 py-2 text-ivory placeholder:text-ivory-dim/60";
const primary = "border border-brass bg-brass px-5 py-2 text-sm font-semibold text-[#170809] hover:opacity-90";
const secondary = "border border-brass px-4 py-2 text-sm font-semibold text-brass hover:bg-brass/10";

export default function AdminPage({ params, searchParams }: PageProps<"/[lang]/admin">) {
  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 sm:px-8">
      <PageHeader title="Administración" intro="Jugadores que han pedido no aparecer en DeadKeys." />
      <Suspense fallback={<Spinner label="Cargando" />}>
        <Panel params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Panel({ params, searchParams }: Pick<PageProps<"/[lang]/admin">, "params" | "searchParams">) {
  const { lang } = await params;
  const sp = await searchParams;
  let ok = okText(sp.ok);
  const err = errorText(sp.err);
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 64);

  const errorNotice = err && <p className="mt-6 border border-red-500/60 px-4 py-3 text-red-300">{err}</p>;

  if (!adminConfigured()) {
    return (
      <p className="mt-8 max-w-[60ch] text-ivory-dim">
        El panel está desactivado. Define la variable de entorno <strong>ADMIN_PASSWORD</strong> (mínimo 8 caracteres)
        y reinicia.
      </p>
    );
  }

  if (!(await isAdmin())) {
    return (
      <>
        {errorNotice}
        <form action={login} className="mt-8 max-w-sm space-y-4">
          <input type="hidden" name="lang" value={lang} />
          <label className="block space-y-1 text-sm text-ivory-dim">
            Contraseña
            <input type="password" name="password" required autoComplete="current-password" className={input} />
          </label>
          <button type="submit" className={primary}>
            Entrar
          </button>
        </form>
      </>
    );
  }

  const entries = await readEntries();
  const blockedIds = new Set(entries.map((e) => e.id));
  if (sp.ok === "blocked") {
    const id = Number(sp.id);
    const entry = entries.find((e) => e.id === id);
    ok = entry ? `${ok}: ${entry.name ?? entry.id}.` : `${ok}.`;
  }

  let results: SteamProfile[] = [];
  let searchError = false;
  if (q.length >= 2) {
    try {
      const asId = parseAccountId(q);
      if (asId) {
        const p = (await getSteamProfilesRaw([asId]))[asId];
        results = p ? [p] : [{ accountId: asId, name: "", avatar: "", avatarFull: "", profileUrl: "", country: null, matchesLast30d: null }];
      } else {
        results = (await searchPlayersRaw(q)).slice(0, 12);
      }
    } catch {
      searchError = true;
    }
  }

  return (
    <div className="mt-6 space-y-12">
      {ok && <p className="border border-brass-dim px-4 py-3 text-ivory">{ok}</p>}
      {errorNotice}
      {!adminSecretConfigured() && (
        <p className="border border-dashed border-brass-dim px-4 py-3 text-sm text-ivory-dim">
          Falta <strong>ADMIN_SECRET</strong> (mínimo 32 caracteres aleatorios): la sesión se firma con una clave
          derivada de la contraseña. Defínela en las variables de entorno del despliegue.
        </p>
      )}
      {storageKind() === "file" && (
        <p className="border border-dashed border-brass-dim px-4 py-3 text-sm text-ivory-dim">
          Sin Redis configurado: la lista se guarda en un archivo local (<code>.data/blocklist.json</code>). En
          producción define las variables de Upstash Redis o los cambios no se conservarán.
        </p>
      )}

      <section className="max-w-[68ch] space-y-4">
        <h2 className="font-display text-2xl tracking-[0.08em] text-ivory">Bloquear a un jugador</h2>
        <form method="get" className="flex gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre de Steam, ID de cuenta o SteamID64"
            aria-label="Buscar jugador"
            className={input}
          />
          <button type="submit" className={secondary}>
            Buscar
          </button>
        </form>

        {searchError && <p className="text-red-300">La API no ha respondido. Prueba de nuevo.</p>}
        {q.length >= 2 && !searchError && results.length === 0 && <p className="text-ivory-dim">Nadie coincide.</p>}
        <ul className="space-y-3">
          {results.map((p) => (
            <li key={p.accountId} className="flex flex-wrap items-center gap-3 border-b border-brass-dim/40 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.avatar ? <img src={p.avatar} alt="" width={40} height={40} className="size-10" /> : null}
              <div className="mr-auto min-w-0 leading-tight">
                <p className="truncate font-semibold text-ivory">{p.name || "(sin perfil conocido)"}</p>
                <p className="text-sm text-ivory-dim">ID {p.accountId}</p>
              </div>
              {blockedIds.has(p.accountId) ? (
                <span className="text-sm text-ivory-dim">Ya bloqueado</span>
              ) : (
                <form action={block} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="id" value={p.accountId} />
                  <input type="hidden" name="name" value={p.name} />
                  <input name="note" placeholder="Nota (opcional)" aria-label="Nota" className={`${input} !w-48`} />
                  <button type="submit" className={primary}>
                    Bloquear
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-[68ch] space-y-4">
        <h2 className="font-display text-2xl tracking-[0.08em] text-ivory">Bloqueados ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="text-ivory-dim">No hay ningún jugador bloqueado.</p>
        ) : (
          <ul className="space-y-3">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 border-b border-brass-dim/40 pb-3">
                <div className="mr-auto min-w-0 leading-tight">
                  <p className="truncate font-semibold text-ivory">{e.name ?? "(sin nombre)"}</p>
                  <p className="text-sm text-ivory-dim">
                    ID {e.id}
                    {e.addedAt && ` · ${e.addedAt.slice(0, 10)}`}
                    {e.note && ` · ${e.note}`}
                  </p>
                </div>
                <form action={unblock}>
                  <input type="hidden" name="lang" value={lang} />
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className={secondary}>
                    Desbloquear
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={logout}>
        <input type="hidden" name="lang" value={lang} />
        <button type="submit" className={secondary}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
