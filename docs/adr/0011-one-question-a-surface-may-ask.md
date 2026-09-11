---
summary: A surface may ask canWrite of the session, not the editing tier — identity, tier, build and config are four axes, canWrite is the derived gate, and publishing the tier is the rejected alternative a sibling repo had chosen.
---

# 11. One question a surface may ask

**Status** Accepted — 2026-09-10
**Context** `src/contexts/SupabaseProvider.tsx`,
[ADR 0009](./0009-the-queue-is-issues-and-a-durable-decision-is-an-adr.md),
issue #517

## Context

Four axes decide what a viewer sees:

- **identity** — is anyone signed in
- **tier** — regular creator, or the editing privilege the database reports
- **build** — a dev server, or a production bundle
- **config** — is a database connected

`canWrite` is derived from all four. That is what a derived flag is for.
Which flag answers which axis:

- **identity** — `session` (is anyone signed in); `canAgent` (may the agent open)
- **tier** — unpublished. Folded into `canWrite`. Surfaces do not read it.
- **build** — `isDevAuthoring`, `isEditPreview`, `devSimulation`
- **config** — `configured`

The template used to publish `isServiceAccount` as well — the tier, as the
database answers it — with a full docblock and no consumer outside the
provider and its own tests. A sibling deployment refused to publish that
flag, on the grounds that an exported second answer which says
almost-but-not-quite the same thing as `canWrite` is an invitation to gate
on the wrong one. Neither repo stated the model where a reader could find
it. The knowledge lived in docblocks in one file.

## Decision

**One question a surface may ask, and that question is `canWrite`.**

The provider still derives the tier and still uses it to compute `canWrite`.
It does not put the tier on the context. `realCanWrite` stays published
for one reason, and it is not a surface's: it is how the simulation's
contract is asserted — with the simulation off, `canWrite` is the real
session's answer, and the simulation moves `canWrite` and `canAgentWrite`
and nothing else. Its only reader is `devPortal.test.tsx`. No component
reads it, the portal included, which needs only `devSimulation`. A test is
not a surface, and this flag is never a gate.

The other published flags each have a real consumer of their own:
`canAgent`, `canAgentWrite`, `canReadPrivate`, `configured`, `session`,
`isDevAuthoring`, `isEditPreview`, `devSimulation`, `isSampleTrial`, plus
`client` and `isLoading`.

What the four viewer states resolve to, through `canWrite` and `canAgent`:

- **Visitor** — no session. `canWrite` false, `canAgent` false.
- **Regular creator** — signed in, not the editing tier. `canWrite` false,
  `canAgent` true.
- **Editor** — the editing tier, a local authoring key, or edit-preview.
  `canWrite` true.
- **Sample trial** — no database, an agent key present. `canWrite` false,
  `canAgent` true.

A surface that needs to know whether this session can mutate the blueprint
reads `canWrite`. A surface that needs to know whether the agent may open
reads `canAgent`. Neither reads the tier.

## What this rejects

**Publishing the tier alongside `canWrite`**, which is what this template did,
and which a reader who finds the tier computed will reach for. It looks
like completeness. It is a second gate. Once a surface gates on it, taking
it back is a hunt through every consumer — which is why the decision is an
ADR rather than a comment.

Issue #517.
