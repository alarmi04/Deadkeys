import { getBuildItemStats } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** Objetos comprados con una build (7 días, rango opcional), para el panel de detalle. */
export async function GET(req: Request, ctx: RouteContext<"/api/builds/[id]/items">) {
  const { id } = await ctx.params;
  const buildId = Number(id);
  const rango = new URL(req.url).searchParams.get("rango");
  const tier = rango === null ? null : Number(rango);
  if (!Number.isInteger(buildId) || buildId <= 0 || (tier !== null && !(Number.isInteger(tier) && tier >= 1 && tier <= 11))) {
    return Response.json({ error: "Parámetros no válidos" }, { status: 400 });
  }
  if (!(await rateLimit("build-items", 60, 60))) return tooManyRequests(60);
  try {
    const stats = await getBuildItemStats(buildId, tier);
    return Response.json(stats, { headers: { "cache-control": "public, max-age=600" } });
  } catch {
    return Response.json({ error: "La API de Deadlock no responde" }, { status: 502 });
  }
}
