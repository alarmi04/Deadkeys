@AGENTS.md

# Deadlock

Web app (Next.js App Router + TypeScript + Tailwind) that shows data from the Deadlock API: https://deadlock-api.com/

## Deploy (Cloudflare Workers)

The app is deployed on Cloudflare Workers via OpenNext. Read the rules below before touching caching, `next.config.ts`, `wrangler.jsonc` or Deadlock API fetches (no Cache Components / `"use cache"`; use `cached()` from `@/lib/cache`; every API fetch needs a `User-Agent`).

@CLOUDFLARE.md

## Design

For any UI or design work (new pages, components, redesigns, reviews), use the `impeccable` skill installed at `.claude/skills/impeccable` (`/impeccable <command> [target]`). Follow its Setup steps before editing UI.
