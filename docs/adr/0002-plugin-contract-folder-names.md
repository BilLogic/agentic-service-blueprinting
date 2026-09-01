---
summary: skills/, references/, agents/, hooks/ and scripts/ keep their names rather than taking class-named ones, because skill text resolves them by path at runtime through the plugin root — the folder names are a published interface, not an organising choice.
---

# 2. The plugin contract's folder names are an exception

**Status** Accepted — 2026-08-25
**Context** [#54](https://github.com/BilLogic/agentic-service-blueprinting/issues/54),
[#59](https://github.com/BilLogic/agentic-service-blueprinting/issues/59)

## Context

This repository has adopted the shared documentation grammar: five root files
each answering one question, `docs/` for authored protocol, folders named for
the class of thing they hold — `adr/`, `guidelines/`, `engineering/`,
`connectors/<name>/`, `plans/`.

Five top-level folders do not follow that rule and will not:

```
skills/       references/       agents/       hooks/       scripts/
```

Read as content classes they are inconsistent with the rest of the tree.
`references/` holds the normative rulebook — protocol, by any reading of the
grammar, and it sits at the root rather than under `docs/`. `agents/` holds
prompts. `hooks/` holds Python. None of those names says what class of thing
is inside; they say what *role* the thing plays in a runtime that reads them.

That is the point. These five names are resolved by string, at runtime, by
text this repository publishes to other people's machines.

- A skill body says `${CLAUDE_PLUGIN_ROOT}/references/data-model.md`. The
  plugin root is wherever Claude Code installed the plugin; the rest of the
  path is ours.
- The canvas agent calls `get_reference { name: 'data-model' }` and the tool
  resolves the bare name against `references/`.
- `.claude-plugin/plugin.json` names `agents/` and `hooks/` for the runtime to
  load.
- A scaffolded blueprint workspace carries its own copies of `skills/`,
  `references/`, `agents/` and `scripts/`, and the same skill text resolves
  against the workspace root instead. Two roots, one set of names.

Nothing type-checks any of that. There is no import, no compile step, and no
test in a consumer's repository that mentions these paths. ADR 1 draws the
line between what is frozen and what is free at exactly this property: a
rename here breaks an installation the next time that code path runs, with no
error anywhere before it. Renaming `references/` to `docs/protocol/` is
indistinguishable, from a consumer's side, from deleting the rulebook.

## Decision

**The five plugin-contract folder names are frozen, and their divergence from
the class-named-folder rule is deliberate.** They are part of the identifier
layer ADR 1 freezes, alongside skill names, reference filenames, agent names,
hook names and tool names.

The grammar governs authored documentation: the root files, and everything
under `docs/`. It stops at the plugin contract's door.

Two consequences worth stating, because they are the ones a tidy-up would
reach for first:

- **`references/` stays at the root.** It is normative protocol and it is not
  moving under `docs/`. `docs/` links to it; `INDEX.md` routes to it.
- **A reference file is renamed only through the deprecation path in ADR 1**,
  never as part of a documentation reorganisation. `get_reference` resolves by
  bare filename, so a rename is a runtime break with no compile error.

## Consequences

A reader arriving from another repository in this estate will find five
folders that look unconverted. This ADR is the answer to "why was this one
missed" — it was not missed, and this file exists so that the question is
answered before someone acts on it.

The decision is already enforced, by a guard written for something else.
`scripts/generate-identifier-manifest.mjs` builds `identifiers.json` by
walking `skills/`, `references/`, `agents/` and `hooks/` under those literal
names. Rename one and its section of the manifest empties, which
`npm run check:manifest` reports as drift on the pull request that did it —
so the names are unrenameable in practice, not only on paper.

The cost is a permanent inconsistency in the tree. It is worth paying, because
the alternative trades a real break in other people's installations for a
cosmetic gain in ours.
