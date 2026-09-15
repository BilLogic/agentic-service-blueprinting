---
'agentic-service-blueprinting': patch
---

The cell surfaces wear the header the other five panels already wore

`panelShell.tsx` has drawn the entity panels' header since the shell was
lifted out of the cell panel, and the cell panel never started wearing it. Its
details, draft, empty and differences surfaces each wrote the drawer header's
class list themselves, each wrote the ✕ — the tooltip, the ghost button, the
icon, the label — and the cell's trail was a second crumb loop beside the
shared one. Five copies of a close button is how one of them ends up a size
larger or stops saying what it closes, and the two crumb loops had already
drifted: the cell's ancestors truncated with no way to read the whole name
back, which the shared trail has always offered on hover.

`PanelHeader` draws all of it now, for all six subjects. It learned a crumb
that collapses to an ellipsis — the cell's four names do not fit the panel's
width, and the step is the one the reader came for — so the cell's trail is
the trail every other panel draws, built by `cellDetailCrumbs.ts` where a
component used to draw one. It learned three more things, each naming a
difference a surface actually has: a title and a description that are shown
rather than read out (the draft's "New cell" and the placement line under it),
the differences surface's bordered band, and the row the widen toggle shares
with ✕.

Nobody opening, drafting, comparing or closing a cell sees a change. The
instrument says so: `npm run slice:cell-edit` was green before the first move
and after every one of them, with no assertion edited, and the 302 tests over
`src/components/blueprint` are unchanged. Each surface's rendered class,
`aria-` and `data-` attribute set was hashed before and after and matches,
with one difference recorded rather than hidden: the cell's trail now writes
`font-normal` on its list and `shrink-0` on its first separator — two
utilities the entity panels' trail already wrote, each a no-op where it lands,
and the drift that made two nearly-identical headers worth reading twice.
