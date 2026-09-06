---
'agentic-service-blueprinting': patch
---

A badge is not a chip, in comments too.

#324 stopped `chip` being a NAME under `src` and the copy list stopped it
reaching a reader, but forty comments went on calling a badge a chip — the
same gap #327 closed for `layer`, one word over. Neither sweep read comments,
by design, so the codebase kept teaching the next reader a word the design
system had withdrawn.

The sentences say what they mean now. Where the thing is this design system's
descriptive marker it is a `badge` — `ui/badge.tsx`'s four size variants and
its warning-role note, the slice presentation's cell badges, the slide
editor's, the loading skeletons', `SliceHeaderBand`, `MobilePathSelector`,
`PathMultiSelect`'s badge layouts, `CanvasDesignTools`' preview badge,
`DevPortal`'s badge row, `AgentPanel`'s accent badge, `tokenDiscipline`'s
badge that does not track its role, and `ScenarioTitleBadge` /
`badgeGeometry.test.tsx`, which meant the default SIZE and now say so. Where
it is something else, the word is the thing: `ui/alert.tsx`'s icon sits on a
filled square, `SupabaseProvider`'s edit-preview tell is a banner,
`AnnotationCaptureMenu` and `agent/attachments.ts` / `agent/loop.ts` carry an
attachment with a label, `ScenarioBlueprintPanel` reads the menubar's `[≠ N]`
count, and the cell panel's "← Back to Differences" is a button, which is what
it renders as. Every one of those spellings that the deployment had already
written is taken from it verbatim rather than reinvented.

`scripts/tests/badge-and-tag.test.mjs` gains the second half of its own walk.
One pass over `src` now yields two things — the code with comments stripped,
and the comments that stripping removed, blanked in place so a line number
still means what it says — and each gets an assertion. `pill` is in it from
the start: the tree carries none under `src`, and the cheapest time to guard a
clean word is while it is clean.

There is no exemption list, and that is the subject rather than an oversight.
The four documents this repository exempts everywhere else — that test, a
changeset, the CHANGELOG and a migration — are outside `src` by construction,
so the rename map and the guard can still write the retired word down. The
figures under `docs/assets/` keep theirs: a `class="chip"` is a name, not a
comment, and this change touches no class string.
