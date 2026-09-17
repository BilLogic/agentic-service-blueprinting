---
'agentic-service-blueprinting': patch
---

On the phone, an agent-driven jump leaves the agent sheet open. The sheet's
dimming clears while the camera flies, the destination is framed above the
sheet rather than behind it, and the caret returns to the composer once the
move settles.

Closing the sheet was the old way to make a jump visible, and it threw the
conversation away mid-run. The run does not stop when the surface does — it
continues in the session module — so a turn that failed after the jump had
nowhere at all to report the failure. That is the state a failed turn landed
in, with an agent working and no surface saying so.

The sheet's scrim is the reason closing looked necessary: it is the page
colour at 90% over the whole viewport plus a blur, so the canvas behind it is
washed out rather than merely covered. It now fades out for the duration of
the flight — blur and hit-testing with it, so a tap during the move reaches
the canvas instead of dismissing the sheet — and comes back when the move
settles. The camera is told what the sheet occupies, measured from the panel
itself, and frames the target inside the strip that leaves visible; cell
focus reads the same pair, having previously centred on the full viewport and
flown the cell behind the panel.

The flight signal is the canvas's existing published camera outcome, read one
way, with a deadline — a camera that never publishes is ordinary, since a
backgrounded tab suspends the frames a flight runs on, and a scrim with no
deadline would stay down for the rest of the session.

Phone only. The desktop dock sits beside the canvas rather than over it, dims
nothing and never closed itself. A jump with the sheet already closed behaves
exactly as before.
