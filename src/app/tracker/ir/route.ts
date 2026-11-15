import { defaultLocale, isLocale, localePath } from "@/i18n/config";
import { REGIONS, type Region, getLeaderboard, searchPlayers } from "@/lib/api";

/**
 * De una entrada de la clasificación regional a la ficha del jugador. La API da varias cuentas posibles por
 * entrada: se busca el nombre en Steam y se elige el primer resultado (los más activos van antes) que esté
 * entre ellas. Si no hay ninguno, se deja al usuario en la búsqueda por nombre.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const region = url.searchParams.get("region") ?? "";
  const rank = Number(url.searchParams.get("puesto"));
  const langParam = url.searchParams.get("lang") ?? "";
  const lang = isLocale(langParam) ? langParam : defaultLocale;
  const back = (path: string) => Response.redirect(new URL(localePath(lang, path), url), 303);

  if (!(region in REGIONS) || !Number.isInteger(rank) || rank < 1) return back("/tracker?vista=clasificacion");

  try {
    const entry = (await getLeaderboard(region as Region, 500)).find((e) => e.rank === rank);
    if (!entry) return back(`/tracker?vista=clasificacion&region=${region}`);

    const match = (await searchPlayers(entry.name)).find((p) => entry.accountIds.includes(p.accountId));
    if (match) return back(`/tracker?a=${match.accountId}`);
    return back(`/jugadores?q=${encodeURIComponent(entry.name)}`);
  } catch {
    return back(`/tracker?vista=clasificacion&region=${region}`);
  }
}
