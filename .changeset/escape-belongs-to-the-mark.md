---
'agentic-service-blueprinting': patch
---

**Escape on a selected or editing annotation no longer also returns the canvas
to the overview.** The annotation layer cleared the mark's selection or editor
on Escape without claiming the key, so the canvas's own Escape — the animated
return to the overview — fired on the same keystroke whenever the editor's
textarea had not yet taken focus, and the board zoomed out from under a mark
the person was still working on. The layer now calls `preventDefault` when the
Escape is its to handle, which is the signal the canvas handler already waits
for.

The browser walk's annotation-drag case met the same race one run in six —
its Escape landed before the new mark's editor had focus, the board zoomed
out, and the drag that followed pressed on empty canvas. It now waits for the
editor to be focused before dismissing it, and for the capture menu to close
before handing the page back; watched pass twenty runs in a row.
