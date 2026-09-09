---
'agentic-service-blueprinting': minor
---

One list edits everything an owner points at

A cell's Resources tab and a placement's resource list wrote the same table,
and only one of them had been designed. The placement's list could set a
preview, set a button, reorder, and take a pasted link named by its host. The
cell's own list was a pair of raw boxes per row — a label and a URL — with no
featuring, no order, and a name you had to type before anything could be
added. An author who had learned one had not learned the other, and the cell's
version could not express things the database already stored.

The list is now one component, `ResourcesList`, which both owners hand rows and
a pair of writes. `PlacementResourcesList` is the wrapper naming its own two;
the cell's tab renders the same list with its own. No migration was needed:
the partial unique index behind "one preview per owner" already indexed a
cell-owned preview, the featuring function already scoped its clear to a
placement-less owner, and the cell's list-sync already left `featured` alone.

Two tempos are kept, and the reason belongs in the code rather than a release
note: the list itself — add, remove, reorder, rename — is a draft saved by one
button in one transaction, because a reorder is a whole-list fact, while
featuring lands at once, because it is one row's flag and the function clears
the previous preview in the same transaction. Waiting for a save would leave
the top of the list showing a state the database does not hold.

Reorder became a drag. The two arrow buttons went, and with them the comment
saying a drag needed a library — `framer-motion` was already a dependency, so
the comment had been justifying the arrows with a cost the project had
long since paid. The handle is a real button: it starts the drag on
pointer-down and answers Up and Down from the keyboard, because `Reorder.Item`
is pointer-only and an order that can only be changed with a mouse is not an
order everyone can change. It is revealed rather than always drawn, by the
rule the dependency why-line already stated — hover or focus-within, always
visible where the pointer is coarse, no transition under reduced motion —
which is now `ROW_REVEAL_CLASS` in one module both consumers import instead of
two copies that could disagree.

Naming happens after the fact. A pasted link is named by its host and an
uploaded file by its name, so nothing has to be typed to get a resource in;
`Rename…` in the row menu opens a field on the row itself, Enter commits and
Escape abandons. There is one door into it, deliberately: the row is already a
drag target, and a click on the name would be a second meaning for one
gesture. Blur is not an exit either — the menu that opens the field hands focus
back to its own trigger as it closes, so a rename that settled on blur would
settle the instant it opened.

The upload is a row the whole way: dimmed with an indeterminate bar while it is
in flight, then an ordinary row, and a refused one offers a retry on the row
rather than sending the author back to the file chooser. The bar is
indeterminate because the storage client reports no progress, and a filling bar
would be a number the upload does not have.

The featured block carries no drag handle, and says so where a reader will
look: there is at most one preview and the buttons follow the main list's
order, so the block has no ordering of its own.
