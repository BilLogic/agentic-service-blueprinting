---
'agentic-service-blueprinting': patch
---

A cell's status is editable from the panel, and its revert restores it.

`StatusSelect` has been in this tree for a while with nothing wired to it. The
control existed, `entityStatus.ts` held the six-rung ladder, `cells.status`
carried the value, the board drew the dashed edge for an unbuilt cell — and the
one governed vocabulary on the board was still the one thing an author could
not set. The panel's cell form now carries a Status field between Summary and
the owner pair, which is where the reference table already said it belonged.

`CellContentUpdate` gains `status`, and it is required rather than optional
because `previous` is that same type: `updateCellContent` records `previous` as
the change's inverse, `executeRevert` replays it as an ordinary update, and a
`previous` missing one field is a revert that restores four and reports "taken
back" — a write that succeeded and did less than it claimed, which is the one
failure the ledger's row-count guard cannot see. Required makes omitting it a
compile error. `cellPanelEditorStatus.test.tsx` asserts the whole inverse, not
just its new key: the status in it has to be the one the cell held when the
form opened.

No migration. `cells.status` and its `grant update (status) ... to
authenticated` both landed with `21000125000000`, whose comment names "the
three columns the editors that follow will write" — this is one of those
editors arriving.

The editor reads the status off the board rather than off `useCellContent`. The
board query already selects the column, the normalizer already maps it and
`entityStatusContract.test.ts` already holds both of those true, so the value is
in memory before the panel opens and a second per-cell read would pay a
round-trip for it. Where the board does not hold the cell there is no row to
read anywhere — the sample-content board, where the editor renders nothing for
an existing cell — and the fallback is the column's own default rather than a
guess.

The agent's `update_cell` reads `status` and hands it straight back. The tool
takes no status argument and this does not give it one: an edit to a cell's
wording that quietly marked a proposed surface live would be the sentence the
agent never said out loud. Widening the tool is a separate decision about the
agent's surface, and would be the change that moves the version — this one
touches no skill name, reference filename, schema filename, agent name, hook
event or tool name, so it is a patch.
