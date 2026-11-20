import { getPlayerRanks, getRanks, rankImage, searchPlayers } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** Sugerencias para el combo del buscador: los primeros perfiles que coinciden, con su rango. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 64) return Response.json([]);
  // El buscador consulta mientras se escribe: 60 por minuto sobra para una persona y frena el abuso.
  if (!(await rateLimit("search", 60, 60))) return tooManyRequests(60);

  try {
    const players = (await searchPlayers(q)).slice(0, 8);
    // El rango es un extra: si falla, se muestran los perfiles sin él.
    const [ranks, catalog] = await Promise.all([
      getPlayerRanks(players.map((p) => p.accountId)).catch(() => ({})),
      getRanks().catch(() => []),
    ]);

    return Response.json(
      players.map((p) => {
        const r = (ranks as Awaited<ReturnType<typeof getPlayerRanks>>)[p.accountId];
        const info = r ? catalog.find((c) => c.tier === r.tier) : undefined;
        return {
          accountId: p.accountId,
          name: p.name,
          avatar: p.avatar,
          country: p.country,
          rank: r && info ? { name: `${info.name} ${r.subrank}`, image: rankImage(catalog, r.tier, r.subrank) } : null,
        };
      }),
    );
  } catch (e) {
    console.error("Búsqueda de jugadores fallida:", e);
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
}
