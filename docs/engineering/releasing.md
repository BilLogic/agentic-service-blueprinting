---
summary: How a release is cut — changesets bump package.json, plugin.json and the CHANGELOG derive from it, and every release ends in an annotated v<version> tag on main, which is the only thing a consumer can pin.
---

# Releasing

**For** whoever cuts a release.
**Answers** what moves the version number, and what has to exist afterwards?

## 1. What a version means here

Semver is scoped to the **plugin contract** — the identifier layer in
[`identifiers.json`](../../identifiers.json). A rename there is a major,
because a consumer resolves those names at runtime with nothing to catch a
break. Refactoring the template app is not a release event, however much of it
moves. The reasoning is
[ADR 1](../adr/0001-two-contract-tiers-and-a-frozen-identifier-layer.md).

## 2. During the work

Add a changeset in the same pull request as the change:

```bash
npx changeset
```

The note says what changed and how big it was. Nothing else in the release
depends on remembering to write it later.

## 3. Cutting the release

```bash
npm run version        # changeset version, then propagate into plugin.json
```

That bumps `package.json`, writes the CHANGELOG entry from the pending
changesets, and copies the new number into `.claude-plugin/plugin.json` — the
version a consumer's plugin install actually reads. Edit the CHANGELOG entry
into prose a human would want to read, and flag identifier-layer changes under
a `### Plugin contract` heading.

Then check the three statements agree, and merge:

```bash
npm run check:version
```

## 4. Tag it. Every release gets a tag.

The tag is not bookkeeping — it is the release. A consumer pins
`github:BilLogic/agentic-service-blueprinting#v<version>`, which resolves a tag
and nothing else; the lockfile integrity hash exists because a tag names one
immutable tree. A released version with no tag is a number nothing downstream
can ask for.

On `main`, at the release commit:

```bash
git tag -a v0.4.0 -m "v0.4.0"
git push origin v0.4.0
npm run check:release-tag -- --require
```

`--require` fails until the tag exists. Without it — the mode CI runs on every
pull request — the check still holds the tags that do exist honest: a tag whose
name is not a released version, a `v<version>` tag pointing at a tree that
states a different version, and, once tagging has started, any release from the
oldest tag forward that skipped one.

Releases 0.1.0 through 0.4.0 shipped before this procedure existed. They are
not retro-tagged; tagging begins at the first tag and may not be interrupted
after it.

## 5. Verifying what a consumer gets

```bash
npm pack github:BilLogic/agentic-service-blueprinting#v0.4.0
```

That is the resolution path a downstream lockfile takes. It prints the file
list, the shasum and the integrity hash. `package.json` is `private: true`,
which blocks `npm publish` and does not block this — see ADR 1 §5.
