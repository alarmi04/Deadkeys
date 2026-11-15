# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, served with equal weight:

- **Players checking stats:** Deadlock players who look up their own profile or a friend's (rank, match history, most-played heroes, performance per hero), usually right after a session or before queueing again.
- **Players studying the meta:** players who want to know which heroes and items are winning on the current patch, before picking a hero or planning a build.

## Product Purpose

A web app that turns the public Deadlock API (https://deadlock-api.com/) into readable pages: a player lookup with profiles, and meta statistics for heroes, items and leaderboards. Success means a player finds a profile or answers a meta question in a few seconds.

Started as a personal project; now planned for public release (non-commercial). No monetization.

## Capabilities and Constraints

- All data comes from `https://api.deadlock-api.com` (REST, public, no key). Static game assets (hero portraits, rank badges, item icons) are served by the API's own asset URLs.
- Player data available: Steam profile search by name or account id (`/v1/players/steam-search`), Steam profiles (`/v1/players/steam`), match history (`/v1/players/{id}/match-history`), rank (`/v1/players/{id}/rank`), per-hero stats (`/v1/players/hero-stats`), teammate and enemy stats, and ingest status.
- Meta data available: hero stats, item stats, synergies, counters, builds (`/v1/analytics/*`), regional leaderboards (`/v1/leaderboard/{region}`, updated hourly by Valve), active top matches (`/v1/matches/active`), patch notes (`/v2/patches`).
- Competitive scene: no Liquipedia data is fetched (removed to stay clear of its API terms). `/competitivo` only links out to Liquipedia (`https://liquipedia.net/deadlock`, CC BY-SA 3.0).
- Rate limits: analytics endpoints share 200 req/min per IP; others 100 req/s. Busy queries can return 503/504 with `Retry-After`. Fetch on the server with caching rather than from the browser.
- Match history is incomplete for players who are not friends with the API's bots; leaderboard entries carry candidate account ids, not one confirmed id.
- Product name: DeadKeys (subtitle "Estadísticas no oficiales de Deadlock"). Intended for public release, so it avoids "Deadlock" as the lead brand. Footer keeps the fan-project and Valve trademark notices, plus links to /acerca, /privacidad and contact.

## Brand Commitments

- Interface copy in Spanish (default, /es) and English (/en), each with its own URLs and hreflang. Hero, item and rank names stay as the game names them.
- Unofficial fan project: must not present itself as Valve's or as an official Deadlock product.

## Evidence on Hand

Live API data only. No testimonials, user counts or press exist; do not fabricate any.

## Product Principles

1. Find a player first: the search box is the fastest path to value for half the audience.
2. Show real numbers from the API, with their sample size or freshness, never invented figures.
3. Respect the API: cache on the server, degrade gracefully on 503/504.
4. Game vocabulary as players use it (souls, badge, lane, build), explained only where ambiguous.
