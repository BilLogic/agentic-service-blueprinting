---
summary: This repo ships two contracts with different failure modes — a plugin contract consumers resolve by name at runtime, and a template surface they fork. Semver covers the first only, its identifier layer is frozen, and one version number lives in package.json with a tag per release.
---

# 1. Two contract tiers, and a frozen identifier layer

**Status** Accepted — 2026-08-25
**Context** [#54](https://github.com/BilLogic/agentic-service-blueprinting/issues/54),
[#55](https://github.com/BilLogic/agentic-service-blueprinting/issues/55)

## Context

This repository is distributed twice over. It is a Claude Code plugin
installed from the GitHub repo, and it is a template you clone and deploy.
Neither of those is an npm package: `package.json` is `private: true` with no
`files`, `exports`, `main` or `bin`, and none of that is an oversight.

The two forms of distribution fail in opposite directions, and until now the
repo had one word — "breaking" — for both.

A consumer installs the plugin and **does not fork it**. They type `/sb:audit`,
the skill dispatches an agent named `auditor`, the canvas agent calls
`read_reference { name: 'data-model' }`, a hook fires on an event name. Every
one of those is a string resolved at runtime. Nothing type-checks it, nothing
imports it, and no test in the consumer's repo mentions it. Rename one and the
consumer breaks the next time that path runs, with no compile error anywhere.

A consumer deploys the template and **does fork it**. The React app, the
styling, the migrations: they own that tree. Our changes reach them only when
they deliberately pull, and arrive as a merge conflict they can read.

Version `0.4.0` was hand-copied into three files and tagged in none, so nothing
downstream could pin any of it (#50). A consumer who decided to take a
versioned dependency on this package found there was no version to depend on.

## Decision

### 1. Two tiers, named separately

**The plugin contract** — skill names and behaviour, reference **filenames**,
the four JSON schemas (IR, crosswalk, slice, change-request), agent names, hook
names, and the agent tool names in `READ_TOOL_NAMES` / `WRITE_TOOL_NAMES`. This
is the tier consumers depend on without forking, so a change here breaks them
silently at runtime. It carries a deprecation path.

**The template surface** — the React app under `src/`, the migrations, the
styling, the eval harness. Consumers fork and own this. A change here is a
merge conflict, which is a thing a human reads, not a thing that fails at 3am.
It carries no deprecation path and does not move the version number.

### 2. Within the plugin contract, the identifier layer is frozen and prose is free

The line sits at the identifier layer because that is precisely what breaks
without a signal. Renaming a reference **file** is a runtime break — an
agent resolves it by bare name — while rewriting every word inside that file is
not a versioning event at all. Making a playbook rewrite a versioning event is
what let eleven vendored files sit stale for ten days while nobody wanted to
cut a release over prose.

That layer is not a list in this document. It is generated from the tree by
`scripts/generate-identifier-manifest.mjs` into
[`identifiers.json`](../../identifiers.json), and `npm run check:manifest`
fails when the tree and the manifest disagree. A rename therefore shows up in
review as a line in a committed JSON file, where a reviewer gets to ask the
only question that matters: who else says this word? The generator treats a
bare-name collision as a hard error, because `read_reference` resolves by bare
filename across every `references/` directory — two files sharing a basename
would make the resolution order part of the contract.

Two related guards belong to the same layer and are named here so a future
tidy-up does not read them as incidental: `npm run check:write-surface` holds
`references/canvas-adapter.md`'s write-surface list against `WRITE_TOOL_NAMES`
(a list of identifiers wearing prose, and it had drifted), and the
plugin-root path checks are why `skills/`, `references/`, `agents/`, `hooks/`
and `scripts/` keep their folder names — skill text resolves those paths at
runtime.

### 3. Semver applies to the plugin contract only

A rename in the identifier layer is a **major**. New skills, new references,
new optional schema fields are a **minor**. Everything else — including
refactoring the template app, however much of it moves — is a **patch** or
nothing at all. Otherwise app churn drives the number into meaninglessness and
the one signal a plugin consumer needs is lost inside it.

The IR schema is versioned separately and in-file, because data rides on it and
sign-off hashes are computed over blueprint content: a hand-signed-off
`blueprint.json` cannot be re-derived, so each IR bump ships a migration
(`scripts/migrate_ir.py`) and `validate_ir.py` rejects an unknown version by
naming the upgrade.

### 4. One version source, and a tag per release

`package.json` states the version. `.claude-plugin/plugin.json` is what a
consumer's plugin install actually reads, and the CHANGELOG's top heading is
what a human reads; both derive from it. `npm run version` runs
`changeset version` and then propagates the number into `plugin.json`;
`npm run check:version` fails when the three disagree and runs in CI.

Every release gets an annotated `v<version>` tag on `main`. The tag is the only
thing a consumer can actually pin — `github:BilLogic/agentic-service-blueprinting#v0.4.0`
resolves a tag, and the lockfile integrity hash exists because a tag names one
immutable tree. `npm run check:release-tag` guards the tags that exist; the
release procedure ([docs/engineering/releasing.md](../engineering/releasing.md))
runs it with `--require`.

### 5. `private: true` stays, and no public surface is declared

`private` blocks `npm publish`, which is what we want: publishing to npm is
explicitly not the distribution path (#54). It does **not** block the path that
is — `npm pack github:BilLogic/agentic-service-blueprinting` resolves the repo,
packs 566 files and prints an integrity hash today, with `private: true` set
and no `files` field.

Declaring `files` would make that worse rather than better. There is no module
entry point to declare in `exports` or `main`; what a consumer needs is
`skills/`, `references/`, `agents/`, `hooks/`, `scripts/` and
`.claude-plugin/`. An allowlist over those is a second hand-maintained
statement of the plugin contract, and the failure mode of getting it wrong is a
reference file that silently does not arrive — the exact silent runtime break
this ADR exists to prevent. The tree ships whole; `.gitignore` is the only
exclusion list.

## Consequences

- A consumer pins a tag and gets an integrity hash, instead of resolving this
  package through a filesystem path (#54's ten-day backwards drift).
- Renaming any identifier is a visible diff in `identifiers.json` and a major
  version. Rewriting a playbook is neither, which is what keeps the rulebook
  current.
- The version number stays legible: a minor bump means the plugin contract
  grew, not that the app was refactored.
- Six earlier releases (0.1.0 through 0.4.0) shipped untagged. They are not
  retro-tagged; `check-release-tag.mjs` requires an unbroken run of tags only
  from the oldest tag forward.
- If this package is ever published to npm, `private`, `files` and `exports`
  are all revisited together, in a new ADR.
