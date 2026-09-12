---
'agentic-service-blueprinting': patch
---

**A sweep survives a file the listing named and the tree no longer has.** Every
sweep here works in two steps — ask for a set of paths, then open each one — and
the two steps are not one moment. `git ls-files` reports the INDEX, which goes on
naming a file after the working tree has stopped having it, which is exactly the
state `npm run version` leaves behind in the seconds between `changeset version`
consuming the changeset files and `git add` recording that they are gone. A sweep
run in that window was handed a path with nothing at the end of it and threw.

The rule now lives in `scripts/read-listed.mjs`, once, and every walk over a git
listing reads it from there: a path that VANISHED between the listing and the
read is skipped, because the listing was true when it was taken and nothing is
wrong with the tree; a path that cannot be read for ANY OTHER reason still
throws. The distinction is the point. A bare `catch` covers both and trades a
loud failure for a silent one — a sweep that skips every file it cannot open
reports nothing and looks exactly like a clean tree, which is worse than the
crash it replaces, and which is what four of the eight sites were already doing.
The one case dropped on the way is a submodule: the clause claimed to cover a
gitlink, this tree has never had one, and a gitlink appearing in a sweep's
subject changes what the sweep measures and is news rather than noise.

The walk this was found in had also been written twice. `standalone.test.mjs`
re-walked the subject by hand rather than calling the script, and the hand copy
was missing the guard the script had had for months — so one release turned a
green tree into a red suite. `check-standalone.mjs` exports the walk now, the
test drives that, and the test counts what came back: a skip is only safe while
something asserts the breadth it did not shrink.
