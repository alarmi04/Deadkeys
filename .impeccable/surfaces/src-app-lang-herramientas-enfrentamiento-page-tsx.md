---
version: 1
slug: "src-app-lang-herramientas-enfrentamiento-page-tsx"
primary_target: "src/app/[lang]/herramientas/enfrentamiento/page.tsx"
related_targets: ["src/components/MatchupArena.tsx"]
---

# Enfrentamiento (herramientas/enfrentamiento)

Mode: Operate. Users: players studying the meta who want to know what to buy with hero A against hero B.
Job: pick two heroes, read the head-to-head and which items/builds overperform for A against B.
Confirmed answers: results = items by phase + published builds scored against the rival (labelled as an estimate); no rank filter (all ranks, 30 days, normal mode, whole match not only lane).
Route: /herramientas/comparar is taken (redirects to the player tracker), so this lives at /herramientas/enfrentamiento?a=&b=.

## Direction contract

THESIS: A fighting-game versus screen, not a form with two dropdowns. Picking a matchup is the moment; the data answers under it. Refuses the category default of two selects plus a table.

OWN-WORLD: Inherits the /heroes select screen: ox/wine charcoal ground, brass deco-frame portraits, hero style colour as a diagonal slab with the hero's background art, hero name SVG, Barlow Condensed extrabold uppercase for game labels, brass rules. Results use the site's ledger/section-title language.

STORY: The visitor sees two empty slots and a VS, hovers heroes to preview them, clicks to lock each side, the locked portrait switches to its gloat pose, and the head-to-head win split appears under the VS. Below, items by phase and scored builds tell them what to buy.

FIRST VIEWPORT: Full-bleed arena. Left half player-1 stage (portrait framed, name SVG, colour slab), right half player-2 mirrored. Centre column holds a large VS and, once both are locked, the win-rate split bar. Under each stage its own horizontal hero carousel with prev/next controls. Swap control in the centre.

FORM: Seed-free: user-pinned composition. seed: none (pinned) "abajo dos caruseles de los personajes y un VS en medio y que cada vez que se pasa por un personaje aparezca su imagen".

Signature interaction: hover/focus previews in that side's stage (neutral card art), click locks (gloat art + slam-in motion), VS pulses once when both sides lock.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
