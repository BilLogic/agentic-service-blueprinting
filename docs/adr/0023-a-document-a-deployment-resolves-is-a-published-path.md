---
summary: The composition documents join the published-path interface ADR 4 drew around references/ and skills/ — a deployment's claims check resolves them by name out of the installed package, so their folder and filenames move only as a release, and the interface roots grow by consumer kind rather than by folder.
---

# 23. A document a deployment resolves by name is a published path, wherever it lives

**Status** Accepted — 2026-09-14. Extends
[ADR 4](./0004-reference-paths-are-a-published-interface.md).
**Context** `scripts/check-reference-paths.mjs`,
`docs/guidelines/composition/overview.md`,
[ADR 20](./0020-the-deployment-imports-the-template.md)

## Context

[ADR 4](./0004-reference-paths-are-a-published-interface.md) settled that the
individual paths under `references/` and `skills/` are an interface rather than
an arrangement, because a deployment imports them by fixed path out of a pinned
tag. It drew the line at those two folders and said so, and it named the shape
of the next problem in its own consequences: a third consumer is a third list,
or a better idea.

This is the third consumer, and it is not an import. A deployment's
composition-claims check reads this package's composition documents out of the
package it installed, to learn which files the package already claims — the
arrangement the harness-claims decision rests on, without which a release that
adds a module turns a deployment's build red over a file it does not own. The
documents are opened by folder and by filename. Nothing imports them, nothing
bundles them, and a rename here lands green in this repository and surfaces in
somebody else's build one pinned tag later.

That is ADR 4's failure mode exactly. What it is not is ADR 4's *folder*. These
documents live under `docs/`, which the same set of checks treats as this
package's own prose — `check:doc-paths` holds the paths those documents NAME to
this tree, and until now nothing held the documents' own paths to anyone else's
expectations.

## The decision

**The published-path interface is defined by who resolves a path, not by which
folder it sits in.** A file this package ships that somebody else addresses by
name — imported, run, or read — is a published path, and
`docs/guidelines/composition/` is one such root alongside `references/`,
`skills/` and `render-walk/`.

Three consequences, all of them ADR 4's, restated for the wider subject:

- **`INTERFACE_ROOTS` grows by consumer kind.** Four roots today, each admitted
  because a consumer resolves it: two by build-time import, one by a runner's
  command line, one by a check reading documents out of `node_modules`. A fifth
  needs the same argument, written down, rather than a folder that felt similar.
- **`CONSUMER_IMPORTS` names every file, and moving one is a release.** Move the
  file, update the list, bump the version, and land the matching change in the
  consumer before the tag it pins moves. Deleting a line because the check went
  red converts a break here into a break there.
- **The rest of `docs/` stays out.** It is prose written for this package's own
  readers, and holding all of it to an outside expectation would freeze a tree
  whose whole job is to be rearranged as the writing changes.

## What was rejected

**A second list, of a different kind, for documents.** ADR 4 offered "a third
list or a better idea", and two lists asking the same question about different
folders is how the two of them drift: a contributor who finds one has no reason
to look for the other. One list, one check, one rule about who resolves a path.

**Moving the composition documents under `references/`** so that ADR 4 covered
them unchanged. That would put nine documents about this application's internal
surfaces into the folder ADR 2 froze for the plugin contract's normative
protocol, where an agent resolves names at runtime — a much stronger promise
than these documents make, and a folder whose meaning would blur the moment
they arrived.

**Leaving them unheld**, on the ground that a deployment can re-derive a
document's location. It cannot: it holds the check byte-identical, and the check
addresses the folder by the one name both repositories agree on.
