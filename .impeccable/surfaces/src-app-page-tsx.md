---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/jugadores"]
---

## Scope

Home page (`/`) of the app, plus the player search results (`/jugadores`) and a minimal player profile (`/jugadores/[id]`) so the search does not dead-end. Mode: Operate. Spanish copy.

Audience: Deadlock players checking a profile or the current meta. Job: find a player in seconds, or glance at which heroes win, who leads the ladder, and what is live now. Constraints: data only from api.deadlock-api.com, fetched on the server with revalidation; leaderboard names cannot be linked to a confirmed account id.

## Direction contract

THESIS: The archive of the city: the meta read like a deco hotel lobby's board, not an esports dashboard of dark cards with neon. Refuses the category's dark-card grid with violet accent.

OWN-WORLD: Oxblood ground (#2A0F12) deepening to near-black, brass (#B8893B) for rules, frames and numerals, ivory text, wine panels; verdigris for wins and vermilion for losses. Poiret One display in wide tracking, Josefin Sans for everything else with tabular numerals. Thin brass hairlines, stepped deco corners, no rounded cards.

STORY: The visitor sees what this is (unofficial Deadlock stats), searches a player or reads the meta, and leaves with an answer.

FIRST VIEWPORT: Top nav (brand left, section links right). A full-width brass-framed panel with stepped corners holding the title, a one-line disclaimer and a 720px search field with its button. Below: two columns, 2/3 heroes on the rise with portraits and dials, 1/3 Europe leaderboard top entries.

FORM: Pick (own top-ranked grounded candidate: the game's own art-deco occult world), position 1 on the ordered list. seed:69b09eccbdd2f5b9. Signature move: the elevator floor-dial, a deco semicircular brass indicator whose needle sits at the hero's win rate, used for win rates wherever they headline.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
