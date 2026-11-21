# Despliegue en Cloudflare Workers

DeadKeys se despliega en **Cloudflare Workers** con el adaptador **OpenNext** (`@opennextjs/cloudflare`). Antes estaba en Vercel, pero el plan gratis se agotaba en dos días.

Leer esto antes de tocar la caché, `next.config.ts`, `wrangler.jsonc`, `open-next.config.ts` o las llamadas a la API de Deadlock.

## Configuración en Cloudflare

En el dashboard, Workers & Pages → `deadkeys` → Settings → Build:

| Campo | Valor |
|---|---|
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Root directory | `/` |
| Production branch | `develop` |

- `npm run build` no sirve como build command: solo hace `next build` y no genera `.open-next/`. El deploy falla con *"Could not find compiled Open Next config"*.
- Cada push a `develop` despliega. **Retry build** recompila el mismo commit, así que no recoge cambios nuevos.
- Los logs están en la pestaña **Observability** del Worker. `observability` está activado en `wrangler.jsonc`.

## Archivos

- [wrangler.jsonc](wrangler.jsonc): Worker, flags de compatibilidad, assets, autorreferencia y KV.
- [open-next.config.ts](open-next.config.ts): caché incremental de Next en KV (`kvIncrementalCache`).
- [src/lib/cache.ts](src/lib/cache.ts): helper `cached()` para cachear datos.
- Scripts de `package.json`:
  - `cf:build`: compila para Workers.
  - `cf:preview`: compila y lo levanta en local con el runtime real de Workers. Úsalo para probar antes de desplegar.
  - `cf:deploy`: compila y despliega desde local. Requiere `npx wrangler login`.
- `.open-next/`, `.wrangler/` y `.dev.vars*` están en `.gitignore`.

## Reglas que no hay que romper

### 1. No usar Cache Components

No hay que activar `cacheComponents` ni `partialPrefetching` en `next.config.ts`, ni usar `"use cache"`, `cacheLife` o `cacheTag`.

OpenNext 1.20.x no soporta Cache Components en Workers: las páginas se cuelgan (*"Worker's code had hung"*) o dan 500 o error 1101. Más información:

- [opennextjs-cloudflare #1464](https://github.com/opennextjs/opennextjs-cloudflare/issues/1464)
- [next.js #94880](https://github.com/vercel/next.js/issues/94880)
- El arreglo está en [PR #1318](https://github.com/opennextjs/opennextjs-cloudflare/pull/1318), sin publicar a 2026-11-20.

Para volver a activarlo, primero hay que comprobar con `npm run cf:preview` que una versión nueva de OpenNext lo soporta.

### 2. Cachear datos con `cached()`

Para cachear datos se usa `cached()` de `@/lib/cache`, que envuelve `unstable_cache`:

```ts
export const getAlgo = cached("getAlgo", "hours", async (id: number): Promise<Algo> => { ... });
// "minutes" = 60 s, "hours" = 1 h, "days" = 1 día. Tags opcionales como 4.º argumento.
```

- La clave es el nombre más los argumentos. Los argumentos y el resultado deben ser **serializables a JSON**: nada de `Map`, `Set` ni `Date`. Ejemplo: `getBlockedSet()` cachea un `number[]` y construye el `Set` fuera.
- Se cachea el **resultado procesado**, no la respuesta cruda de la API. Algunas respuestas pesan casi 2 MB.
- La caché vive en el KV `NEXT_INC_CACHE_KV` y sobrevive a los deploys.

### 3. Todo `fetch` a la API de Deadlock lleva `User-Agent`

El firewall de `api.deadlock-api.com`, que también está en Cloudflare, devuelve **403** con una página HTML de bloqueo a las rutas `/v1/players/*` (búsqueda, perfil, rango, historial…) si la petición llega sin `User-Agent`. Desde un Worker no se envía ninguno por defecto. En local funciona igual, así que el fallo solo aparece en producción.

`get()` en [src/lib/api.ts](src/lib/api.ts) ya lo envía (`USER_AGENT`). Cualquier `fetch` nuevo a la API debe usar `get()` o añadir esa cabecera.

### 4. Flags de compatibilidad

Los flags de `compatibility_flags` en `wrangler.jsonc` son necesarios:

- `nodejs_compat`: Next y el código usan `crypto`, `fs`, etc.
- `no_handle_cross_request_promise_resolution`: la caché de respuestas de Next comparte promesas entre peticiones. Sin este flag, que viene activo por defecto con fechas recientes, toda página da 500 (*"This promise was created by a request that has since ended"*).

### 5. El KV ya existe

El namespace `deadkeys-next-inc-cache-kv` (ID `060a532456564ae588433db23b7fb764`) está fijo en `wrangler.jsonc`.

No hay que quitar el `id`. Sin él, `opennextjs-cloudflare deploy` intenta llenar la caché antes de que exista el KV y falla con *"No KV namespace ID found for binding NEXT_INC_CACHE_KV"*.

### 6. Límite de peticiones (rate limit)

[src/lib/rate-limit.ts](src/lib/rate-limit.ts) usa el **Rate Limiting nativo de Workers** (bindings `RL_*` en `ratelimits` de `wrangler.jsonc`), compartido entre las instancias del Worker. El contador en memoria solo es un refuerzo, porque cada instancia tiene el suyo.

- La IP sale de `cf-connecting-ip`. `x-real-ip` y `x-forwarded-for` los controla el cliente en Cloudflare: si se usan, el límite se salta mandando una IP falsa.
- Para limitar un bucket nuevo, añade un binding en `ratelimits` (`period` solo admite 10 o 60 s, y `namespace_id` debe ser único) y regístralo en `BINDINGS`.
- Esto solo cubre las rutas que llaman a `rateLimit()`. Para el resto de la web, usa una regla de rate limiting en el WAF de Cloudflare (Security → WAF).

## Variables de entorno

Van en Settings → Variables and secrets.

| Variable | Notas |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública, `https://deadkeys.app`. Las `NEXT_PUBLIC_*` se incrustan en el build: hay que ponerlas como variables de build y redesplegar. |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_GA_ID` | Igual que en `.env.local`. |
| `BLOCKED_ACCOUNT_IDS` | IDs bloqueados, separados por coma. Es la única forma de bloquear en producción. |
| `ADMIN_PASSWORD`, `ADMIN_SECRET` | Opcionales. Sin Redis, el panel admin no guarda nada. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | **No configuradas** a propósito: no se quieren servicios extra. |

Sin Redis, la lista de bloqueados del panel admin, el rate-limit y las sesiones admin usan archivo o memoria. En Workers no hay disco persistente, así que el panel admin **no persiste** en producción.

## Rendimiento y límites

- Las páginas que leen `searchParams` (inicio, héroes, objetos, tier list, builds, enfrentamiento, tracker) se renderizan en cada petición. Sus datos vienen de la caché. Sin Cache Components no hay esqueleto estático (PPR).
- Prerenderizadas: acerca, privacidad, competitivo, directo, mapa, parches, herramientas y sitemap.
- El **plan gratis** de Workers permite 10 ms de CPU por petición, y algunas páginas gastan entre 20 y 35 ms. Si aparecen errores **1102** (*CPU limit exceeded*), la solución es Workers Paid (5 $/mes).
- El Worker pesa unos 2,5 MB comprimido. El límite gratis es 3 MB.
- El **plan gratis** admite **50 subpeticiones** (`fetch` salientes) por visita. Las que pasan del límite fallan, `safe()` se traga el error y la página sale vacía sin dar error. En local no hay límite, así que no se nota. Ejemplo: `getBuilds()` hace un `fetch` por build. Hay que pedir solo las que se muestran (unas 30) y filtrar con parámetros de la API, no trayendo cientos de builds para filtrarlas en el servidor.

## Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| Error 1101 / *"Worker's code had hung"* | Se ha reintroducido Cache Components, o falta el flag `no_handle_cross_request_promise_resolution`. |
| Perfil de jugador → "no encontrado"; búsqueda → 502 | Falta el `User-Agent` en las llamadas a `/v1/players/*`. Busca `fallida` en Observability: el log incluye el código HTTP. |
| *"Could not find compiled Open Next config"* | El build command no es `npx opennextjs-cloudflare build`. |
| *"No KV namespace ID found…"* | Falta el `id` del KV en `wrangler.jsonc`. |
| Error 1102 | Límite de CPU del plan gratis. |
| Una lista sale vacía en producción pero bien en local | Más de 50 subpeticiones en esa visita (plan gratis). |

Para depurar en local con el runtime real: `npm run cf:preview` y abrir http://localhost:8787.
