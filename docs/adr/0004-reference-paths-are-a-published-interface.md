---
summary: The individual file paths under references/ and skills/ are a published interface, not the arrangement of a folder — a deployment imports twenty-two of them by fixed path at build time from a pinned tag, so a move is a version bump plus a matching consumer change, never a silent move, and a path-stability check fails this repo's build before the consumer's.
---

# 4. Reference paths are a published interface

**Status** Accepted — 2026-09-05
**Context** [#135](https://github.com/BilLogic/agentic-service-blueprinting/issues/135),
[#138](https://github.com/BilLogic/agentic-service-blueprinting/issues/138)

## Context

ADR 2 froze the five folder names at the root, because skill text resolves
`${CLAUDE_PLUGIN_ROOT}/references/data-model.md` by string at runtime. That
argument stops at the folder. Inside the folder a reader sees an ordinary
directory of markdown, and ADR 1's frozen identifier layer reads as being
about names a plugin resolves — skill names, reference basenames, agent and
tool names — with `check:manifest` diffing them so a reviewer can ask who else
says that word.

A second kind of consumer arrived that neither covers. The deployment this
template was generalised from installs it as a git-URL dependency pinned to a
tag, and imports twenty-two of these documents by fixed path, at build time,
through Vite's `?raw`:

```ts
import laneRoles from '<this package>/references/lane-roles.md?raw'
import mapSkill  from '<this package>/skills/map/SKILL.md?raw'
```

Eighteen references and the four `SKILL.md` bodies. Not a resolver that could
fall back, not a bare name looked up in a manifest — a module specifier the
bundler either resolves or fails on. Its agent's read tool names most of them,
its skill loader the four skills, and its own write-surface guard reads
`references/canvas-adapter.md` straight out of `node_modules/`.

Nothing on this side knew that. `check:manifest` shows a rename as a diff, but
a diff is a question for a reviewer, and the reviewer has no reason to know
which files somebody else opens by name. `check:doc-paths` holds this repo's
own documents to paths inside this tree, which is the same class of assertion
pointed the other way. So a move landed here green and was discovered at the
consumer's build — after the tag, at upgrade time, by whoever happened to bump
the pin.

**The alternative was tried.** Before the package pin, the two repos kept
these files in step with a file-sync. It inverted, and reverted a rename
across eighteen files: the copy that had not been renamed won, and carried the
old names back over the new ones. The sync was deleted and the pin replaced
it. The pin works precisely because the paths hold still — there is no
reconciliation step left to get the direction wrong, only a specifier that
resolves or does not.

## Decision

**The paths under `references/` and `skills/` are a published interface.** Not
the folder names alone, which ADR 2 covers, but each file's full path inside
them. A path a consumer imports does not move quietly.

Moving one is allowed, and it is a release:

1. move the file;
2. update `CONSUMER_IMPORTS` in `scripts/check-reference-paths.mjs`;
3. bump the version and write the CHANGELOG entry;
4. land the matching import change in the consumer before the tag it pins
   moves.

The consumer then breaks on purpose, at the moment it chooses to upgrade, with
a version number saying so — instead of by surprise, on whichever branch
happened to bump the pin next.

**`scripts/check-reference-paths.mjs` holds the list and fails when a path is
absent**, so the move fails this repo's build first. It runs in the guard set
before push and in CI, next to `check:doc-paths`, whose assertion it mirrors
outward. A path must be both present on disk and tracked by git: the index
still holds the old name after a bare `mv`, and a file git does not track is a
file a git-URL install never ships.

## Consequences

- **The list is maintained by hand, and that is the point.** It is not derived
  from the consumer's tree, because a check that reads another repository
  cannot run without it and would go green whenever it could not reach it. A
  hand list is a claim this repo makes about who reads it; the header carries
  the `grep` that re-derives it.
- **A file the consumer stops importing stays guarded until somebody removes
  its line.** Slightly conservative, and the cheaper of the two errors.
- **Deleting a line to clear a red build is the failure mode.** It converts a
  break here, now, into a break in the consumer at its next upgrade, which is
  the situation this record exists to end. The check's failure message says
  so.
- **A third consumer is a third list, or a better idea.** Two consumers
  importing by fixed path is a data file; more than that is an argument for
  publishing the list as an artifact consumers assert against.
- **This does not freeze the documents' contents.** Prose, rows and playbook
  steps change under semver like anything else. It is the path — the thing a
  bundler resolves — that holds still.
