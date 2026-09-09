---
'agentic-service-blueprinting': patch
---

A rulebook for an empty room

`docs/plans/` held one file, and that file was the rules of the folder: what a
plan is, that a plan is dated and never edited, that `status:` is required in
its frontmatter, that a plan is never current guidance. Its own last section
said the folder was empty — the planning documents were retired when the
package was generalised out of the deployment it grew from, because they
described that deployment more than they described this package.

So the concept goes, not just the files. Keeping the machinery for the plans
that might land next is the cheap-looking option and the one this rejects: a
reader who takes the doctrine seriously learns a document class the repository
does not have, and an agent cannot tell a dormant convention from a live one.

What went with it. The index generator loses its history directory, the table
it built, the rule that failed the build on a plan stating no `status:`, and
the routing row asking whether a plan is still true — `docs/index.md` now has
one table, and says in a line that everything in it is protocol. `docs/`'s own
overview, the documentation grammar and the contributing guide stop pointing
readers at a folder that is not there. The vocabulary sweeps exempt `docs/adr/`
and nothing else.

The migration that cited a plan by address loses the line outright rather than
having it rewritten. The line above it already says what the migration does and
the block below already states the invariants, so the address was carrying
nothing but a pointer — and it had already stopped pointing anywhere.

One thing was rescued before its protection was deleted. The standalone check
excluded the folder on the argument that those documents ordered the decoupling
and stripping them would destroy the record of why the boundary exists. That
exemption is dead, but the argument is not, so it now sits in the header of the
check itself: standing alone is an assertion this package makes about itself,
the reader it is made to is a contributor with none of the context the package
grew up in, and a check is what makes the boundary verified rather than
assumed.

The decision is
[ADR 9](docs/adr/0009-the-queue-is-issues-and-a-durable-decision-is-an-adr.md).
Work in flight is GitHub issues, a durable decision is an ADR, current
behaviour is protocol, and the retired content is in the git history.
