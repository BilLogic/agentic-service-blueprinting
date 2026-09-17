---
'agentic-service-blueprinting': patch
---

An agent-driven jump on the phone reveals the canvas for as long as the camera
is actually moving, and a jump that lands is reported as landed.

The reveal was a flicker — a sixth of a second — and every scenario jump
answered "navigation was cancelled" while the URL and the canvas both showed
the move landing. Both came from the same place. A viewport can leave the tree
mid-flight without the destination changing: the path filter for a freshly
opened scenario arrives a beat after the selection, the board falls to its
no-paths state, and the canvas remounts and refits the SAME target. The dying
mount's cleanup published `cancelled` against the key it had just armed, so
every waiter — the tool's and the sheet's — was answered early, and the real
landing a few frames later reached nobody.

An unmount is no longer a verdict. `useZoomPanViewport` lets the flight go
instead of cancelling it, which leaves the waiters listening for the mount
that takes the camera over; a canvas that is gone for good publishes nothing
and each caller's own deadline says so honestly, rather than claiming a
cancellation the departing viewport is in no position to claim. Supersession,
a genuine cancel and the deadline all report exactly as before.

The sheet's scrim is now one state in one render. Its opacity and its
pass-through used to fall out of step because only one of them animates: the
wash eased over 150 ms while `pointer-events` flipped in the frame the class
landed, leaving a moment when the backdrop was opaque yet passed taps through
and a moment when it was invisible yet swallowed them — the exact hazard the
pass-through was added to remove. Both properties now transition together on
one clock, so taps reach the canvas only once the wash is more gone than
there.

The phone also reports its selected phase to the agent's UI context, in the
same words the desktop shell uses. Without that line an agent-driven phase
jump could never be verified on a phone and answered "the selected phase was
not verified" while sitting on exactly the phase asked for.

Desktop chrome is untouched, and `AgentDock` still has no backdrop.
