---
'agentic-service-blueprinting': patch
---

The cell panel's facts are resolved once and read three narrow ways

One hook derived sixteen values about the selected cell and handed the whole
object to three readers whose slices barely overlapped: twelve of the sixteen
keys were read by exactly one reader, a reader's prop type said nothing about
which of them it used, and the path's board was looked up again in seven of the
derivations — one fact with seven origins and no single place to be wrong in.
No test imported the module at all, which is how a sixteen-key interface grows
without anybody noticing the shape.

`useSelectedCell` is now that single place: it finds the board once, picks the
cell out of it, identifies the lane and walks the arrows. `useCellPanelFacts`,
`useCellOverviewFacts` and `useCellTabsFacts` are functions of that resolution
and of nothing else, one per reader, and each names only what its reader reads
— the drawer takes the cell's position and its dependency endpoints, the
overview takes the placement and the featured links, the tab row takes the
arrows and the two lists its Resources tab renders. None of the three receives
the resolution itself. The breadcrumb takes the path entry's own type rather
than reaching into the facts type for it, and `BlueprintLaneLike` — exported,
imported nowhere — is gone.

Nobody opening, editing, saving or reverting a cell sees a change. This is a
pure refactor, and the instrument says so: `npm run slice:cell-edit` was green
before the first move and after every one of them, with no assertion edited,
and the tests over `src/components/blueprint` are unchanged. What is new is the
unit tests, which read each reading through its own interface and assert its
key set as well as its values — a tab row that could reach the clicked
placement is the wide interface growing back, and the key-set case says so
before the values ever disagree.
