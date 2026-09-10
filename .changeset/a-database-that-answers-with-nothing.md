---
'agentic-service-blueprinting': minor
---

A database that answers with nothing is still the answer: the bundled sample
no longer fills a connected deployment's navigation while the first fetch is
in flight, or when the workspace genuinely has no phases.

**A connected deployment was showing this kit's phase and scenario names on
every page load.** Not through a merge — #497 closed that one — but through
timing. The navigation fell back to `sample.nav` whenever the structure read
came back with no rows, and "no rows" covers three states, not one: no
database configured, a database whose first fetch has not returned yet, and a
database that holds no phases. Only the first is the fresh clone the sample
exists for. On the other two the sample arrived as the deployment's own, with
nothing on screen saying so — and the second of those happens on every single
load, in the window before the query resolves.

The question the navigation asks is now `isBundledSampleActive()`, the same
one the board has asked since #493: is a database configured at all. A
configured deployment's navigation is its rows, whatever they are, including
none of them.

**What you will see change.** If your deployment has a database, the phase
list is briefly empty on load where it used to be briefly full of somebody
else's phases, and a workspace with no phases in it now says so — "No phases
in this workspace yet", on the canvas and in the phone's drawer — instead of
drawing this kit's blueprint. Loading and empty are deliberately different on
screen: a load is the progress bar and the skeleton rows it always was, and
only a read that has actually come back bare gets the empty message. If no
database is configured, nothing changes at all; the fresh-clone nav is
exactly what it was, and the test that pins it as EXACTLY `SAMPLE_NAV` is the
one that already existed.

**What changed under it.** `EditorContext`'s `slides` is no longer guaranteed
non-empty, so `activeSlideId` and `activeSlide` are `string | null` and
`NavItem | null` rather than two `slides[0]!` assertions resting on a fallback
that has gone. Every reader was made to say what it does with no board: the
canvas draws an empty state, the docked header and the prev/next controls
draw nothing, and the camera falls back to fitting the whole canvas. The
phone's phase list gained the loading skeleton and empty message its slice
list already had.
