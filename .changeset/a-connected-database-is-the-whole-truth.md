---
'agentic-service-blueprinting': minor
---

A connected database is the whole truth: the bundled sample renders only when
no database is configured.

**Content on screen today will disappear.** If your deployment has a database
and your board has gaps, some of what you are looking at is not yours — it is
this kit's sample, appended underneath your rows. After this release those
lanes, columns, cells, dependencies and path names are gone, and the gaps they
were covering are visible. Nothing of yours is deleted: the rows in your
database are untouched, and everything that disappears is content that was
never in it.

What to do about it. Open each board once after upgrading and look for what
went missing — that is the list of things the sample was answering for. Where
you want the content, author it: it is now a row in your database like any
other. Where you do not, the empty lane is the correct answer and was the
answer all along. A scenario or path the database has nothing for now draws
nothing rather than the kit's board, so a tab that empties out is a tab whose
content was never yours either.

**What changed.** `resolveBlueprintForScenario` no longer merges the two
sources. On the database path it used to append every fallback lane, cell,
step and dependency the rows lacked and fill a blank path name, summary or
note from the fallback's prose, then report `source: 'database'` — so the leak
was invisible, and the content that leaked was a blueprint of this kit wearing
the adopter's path names. The path list did the same through
`mergePathsWithFallback`, which is removed with it.

**Telling the two states apart.** A `sample data` badge sits in the workspace
chrome whenever no database is configured. It is the one state the sample is
reachable in, and connecting a backend hides it permanently.
