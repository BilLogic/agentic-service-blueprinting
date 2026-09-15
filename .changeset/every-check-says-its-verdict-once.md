---
'agentic-service-blueprinting': patch
---

One module answers what a check concludes.

`scripts/sweep.mjs` was already the first half of every check — name a Subject,
receive its files. Nothing was the second half, so each check carried its own
is-main guard, its own empty-subject rule, its own summary and its own exit, and
the exits had drifted into two incompatible styles. `scripts/verdict.mjs` is
that half, once: a check returns its findings and the count of what it examined,
and the module renders the four outcomes and sets the exit code one way. Every
check's green line and every finding is unchanged to the byte — the module
renders and never composes the wording. What does change is the two bespoke
empty-subject messages, which are now the one shared message and the one shared
register.

`scripts/verdict.mjs` is published as a shared script. A deployment that holds
these checks byte-identical will take the module with them on its next pin; the
shared-script list names it, and the closure rule carries it there.
