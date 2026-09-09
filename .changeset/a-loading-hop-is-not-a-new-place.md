---
'agentic-service-blueprinting': patch
---

A loading destination is not a new place to fit

A canvas already saved its pan and zoom when its tab unmounted, and already
restored them on the way back. Readers still lost their framing on every tab
switch, because a return does not remount straight onto its board: it boots on
a skeleton, under a destination that names the wait, and the real board only
replaces that a beat after readiness renames the destination. The viewport read
the hop as *the reader went somewhere else*, threw the saved framing away in
its state initialiser, and fitted.

So the destination key is now compared only when it names a board that is
actually on screen. `cameraDestinationResolved` is what says so — false while a
surface stands a skeleton in for content that has not arrived — and while it is
false the inherited framing is HELD rather than judged. The ordinary fit still
runs underneath, exactly as before, so a board that never had a framing to
inherit behaves identically and nothing waits on a decision that may never
come.

The decision itself moved into one place and grew a second seam. A mount that
never waited settles it where it always did, inside the fit effect, before the
fit is scheduled. A mount that DID wait has no `resetKey` change to settle on —
the destination was already named while the skeleton stood in for it — so the
arrival of the board is its own layout effect, declared after the fit effect so
the two can never both decide.

Two things fell out of separating *what is being adopted* from *what is on
screen*. The framing now comes from the snapshot rather than the live
transform, which by then is the placeholder's fit; and the geometry it is
checked against is measured at the zoom the board is painted at, not the zoom
being adopted, because `measureFitBounds` divides client rectangles back out by
the live scale and mixing the two reports a box off by the ratio between them.

Both refusals are unchanged and now covered through the wait as well: a
different semantic destination, and a fit target whose geometry genuinely
moved, still fall back to the canonical immediate fit. Leaving mid-flight still
remembers where the camera was, never where it was going — and leaving before
the board arrives hands the inherited framing straight back rather than filing a
placeholder under a key that names the wait.
