import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

// Caché de Next (prerenderizado y "use cache") guardada en Workers KV (binding NEXT_INC_CACHE_KV en wrangler.jsonc).
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
