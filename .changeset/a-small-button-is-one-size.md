---
'agentic-service-blueprinting': patch
---

A small button is one size, and the rung is what says so: thirty-seven
`size="sm"` call sites stop restating the height and the font size the size
already sets.

**Two buttons in the same column rendered at two different sizes, and which
one you got depended on whether the author had remembered to type a class.**
`ResourcesList` had the pair adjacent on screen: "Upload a file" carried
`text-xs` and rendered at 12px, while "Save resources" fourteen lines below
carried only `h-7` and inherited the `sm` rung's own `text-[0.8rem]`, 12.8px.
`CellPanelEditor` had the same split between "Add value proposition" and the
Save/Cancel row under it. Thirty-seven of seventy-four `size="sm"` call sites
wrote one or both of those classes; thirty-seven did not, so the rung decided
half the buttons and the call site decided the other half.

**The overrides are gone rather than the rung retuned.** `components.json`
points the shadcn CLI at `@/components/ui`, so `button.tsx` is regenerated
rather than authored — `tokenDiscipline.test.ts` already names its
`text-[0.8rem]` as vendored for that reason, and a retune there would be
deleted by the next `npx shadcn add button`. The size the rung sets was never
the problem; nothing trusting it was.

**What you will see change.** Thirty-three small buttons that were a shade
under the rung now sit on it — the same 12.8px their untouched neighbours have
had all along, so an editor panel's controls agree with each other for the
first time. Nothing changes height: `h-7` was the rung's own value at every
site that wrote it. Overrides that decide something else stand, including the
ones that decide a size on purpose: `EditorZoomIndicator` keeps its `h-8`
elevated card, and the five controls that pair `h-6` with `text-2xs` — the
filter and ledger openers, replace, retry and the scenario action — are a
whole step down the ladder rather than a wobble on one rung, and keep it.

**What holds it.** `lib/buttonSizeContract.test.ts` reads the rung off
`buttonVariants` and every `size="sm"` call site off the tree, and asks
`tailwind-merge` — the resolver `cn` runs at render time — which classes are a
height and which are a font size, so neither the rung's numbers nor the list of
rung names is written down twice. Two clauses: the rung's height is never
restated, and a font size is never set on top of the rung's own box.
