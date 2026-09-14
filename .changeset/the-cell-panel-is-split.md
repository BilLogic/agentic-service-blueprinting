---
'agentic-service-blueprinting': patch
---

**The cell detail panel's body is nine modules, and the cell-edit slice says
nothing moved.** The panel was 1481 lines, of which 1258 were one function:
the read-only rows, the form over the cell fields, the specs, the
dependencies, the resources, the three other surfaces the same drawer can
show, and the save, all in the order they happened to be written. A person
looking for what a cell IS had to read past what the drawer DOES.

It is 553 lines now. `cellDetailFacts.ts` answers one question — given a
selection (or a draft) and the boards in memory, what is there to show — and
answers it once, for everybody: the connections, the lane, the placement and
its reading, the arrows a cell owns and the ones it may point at, the
storyboard strip. `CellDetailOverview.tsx` takes those facts and renders the
top of the details surface, with the dozen readings it depends on beside it
rather than a hundred lines above. `CellDetailTabs.tsx` owns the three tabs.
`CellDetailBreadcrumb.tsx` says where the cell sits. Differences, a draft cell
and nothing-selected are each their own module, because they are siblings of
the details view and not stages of it. `PanelSurfaceSwitcher.tsx` and the
panel's agent commands come out with them.

What stayed in the panel is the drawer, which is the thing the panel is: which
surface is showing, how wide it is, what closes it, and the one footer that
every Save in it portals into.

**No behaviour changed, and the instrument is the reason that is a claim
rather than a hope.** `npm run slice:cell-edit` ran before the first move and
after every one of them, green each time with no assertion edited, as did the
285 tests over `src/components/blueprint`. No class, no `data-` attribute, no
aria label, no test id. The one save still writes the same columns in the same
shape, and every section that derived its fields from `src/lib/cellFields.ts`
still derives them from there.

This is the first of the three splits ADR 0017 held, and that record gains its
outcome line. The annotation layer and the agent panel are still to do.
