---
'agentic-service-blueprinting': minor
---

The panel title carries the scenario's note, and a cover fixture stops naming a docs path

`ScenarioBlueprintPanel` passed `panelTitleInfoTooltip: null` with a comment
saying the prop is a seam a fork uses, "the template has nowhere to store one".
That has not been true since `scenarios.note` shipped: `NavItem.note` carries
it, `phasesToSlides` fills it, and every other surface that shows a scenario's
aside already reads it. The panel title was the one that did not, so a reader
who wrote a note saw it everywhere but there.

Fed from `slide.note`, on the same condition the summary already uses, and the
comment goes with it.

Separately, `coverPage.test.tsx` used `docs/guide/02-x.md` as a fixture path.
No such file exists in any repository, which is fine for a fixture and
misleading as text: it reads as an address. It is now `guide/section.md`,
which reads as what it is.
