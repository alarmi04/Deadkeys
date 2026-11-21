import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import staticAssetsCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * Caché de Next sin KV (el plan gratis de KV solo admite 1000 escrituras al día y se agotaba).
 *
 * - Lectura: primero la Cache API de Workers (gratis, sin límite de escrituras, una por centro de datos);
 *   si no está, el prerenderizado del build, copiado a los static assets al desplegar.
 * - Escritura (`cached()` y revalidaciones): solo en la Cache API. Los static assets son de solo lectura,
 *   así que su `set`/`delete` no hacen nada (el original registra un error en cada llamada).
 *
 * El `name` es el de la caché de static assets para que `opennextjs-cloudflare deploy` copie el
 * prerenderizado a los assets en vez de subirlo a KV.
 */
const prerendered = {
  name: staticAssetsCache.name,
  get: staticAssetsCache.get.bind(staticAssetsCache),
  async set() {},
  async delete() {},
};

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(prerendered, {
    mode: "long-lived",
    // No volver a leer de los static assets en cada acierto: el prerenderizado no cambia hasta el próximo deploy.
    shouldLazilyUpdateOnCacheHit: false,
  }),
});
