---
'agentic-service-blueprinting': patch
---

A badge is not a chip, in the figures either.

#324 stopped `chip` being a name under `src` and #358 stopped it being a
comment there, and both sweeps walked past `docs/assets/`. Fifty-one class
strings in the cover figures still said the retired word — forty-one
`class="chip"` attributes and ten `.chip` rules across ten of the thirteen
files — because no check had ever opened an SVG looking for a NAME.
`retired-copy.test.mjs` does open them and was right not to catch this: its
subject is the words a reader sees, which in an SVG means the text nodes.

The figures are AUTHORED, so this is an edit to the source and not to an
output: `scripts/sync-cover-assets.mjs` copies `docs/assets/` to `public/cover/`
and changes nothing, and `public/cover/` is generated and gitignored. Nine
files take `badge` straight — the marker those rounded rects draw is the one
this design system calls a badge, one per thing and never drawn from a set.
`data-model-hierarchy.svg` is the tenth and could not: it already HAD a
`.badge`, at 7.5px, on the lane markers in its miniature path panel, which is
the same thing `blueprint-anatomy.svg` calls a badge. Its phase markers are
badges too, so they say which badge they are and became `.phaseBadge` rather
than collapsing two rules with different metrics into one name. Every rule and
every attribute moved together, so the diff is fifty-three lines for
fifty-three and no figure renders a pixel differently.

`scripts/tests/badge-and-tag.test.mjs` gains a third subject, which is the
half that stops this recurring. A figure is styled only by its own `<style>`
block — `CoverFigure` serves it through an `<img>`, which seals page CSS out —
so two assertions hold over one walk of the class vocabulary. No class name
may say a retired word, in either place a figure can write one: the rule in
the stylesheet and the token in a `class` attribute. And every class a figure
uses must have a rule in that same file, which is what makes the first
assertion impossible to satisfy by halves — rename the rule alone and the
attributes style nothing, rename the attributes alone and the rule does. The
converse is deliberately not asserted, and four unused rules stand today: a
rule nobody uses teaches nobody, because a name is learned where it is used.

The word list stopped being a literal in the same change. `RETIRED_DESIGN_WORDS`
is now read off `RENAME_MAP` by the map's own shape — the rows that retired no
database identifier and carry no migration, which is exactly the kind of rename
no schema and no generated type can hold and precisely what this file exists to
hold instead. It selects the `pill`/`chip` row today, a test states that as a
fact about the map, and a second such row would be picked up on the day it
lands.
