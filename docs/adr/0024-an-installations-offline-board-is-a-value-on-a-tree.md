---
summary: An installation's offline board — the settled sample registry every no-database lookup reads — is a value a provider holds and hands down its tree, not a module-level store; it is a content document settled once per installation rather than state, and the readers with no hooks above them take it as an argument, so neither condition that sends state to a module store fires.
---

# 24. An installation's offline board is a value on a tree, not a store

**Status** Accepted — 2026-09-14. Narrows
[ADR 0005](./0005-cross-surface-state-is-a-module-store.md) for one value; it
amends nothing in it.
**Context** `src/data/blueprintFallbacks.ts`,
`src/contexts/DeploymentConfigContext.tsx`,
[ADR 0005](./0005-cross-surface-state-is-a-module-store.md)

## Context

The offline board is what a build with no database draws: the registry a
deployment supplies on `sample.blueprints`, or the package's own. It reached
its readers through a module-level variable that `DeploymentConfigProvider`
wrote during its own render, and eleven readers reached for that variable while
they drew.

[ADR 0005](./0005-cross-surface-state-is-a-module-store.md) sends state to a
module store on either of two conditions, and the second of them —
code with no hooks available to it must read it — describes half of this
board's readers exactly: the navigation model, the slice scan, the blueprint
resolver and the agent's no-database reads are plain functions. Read as a rule
about every value a bare function touches, that condition points here.

It is not that rule. Both of ADR 0005's conditions are about STATE: something
that changes while the app runs, where the question is who is told. The board
changes never. It is a content document, settled once per installation before
anything draws — the same kind of thing as the cover and the nav beside it,
which have always been carried by reference on the resolved config and read
through a hook. A store buys notification, and there is nothing to notify
about.

What the module variable did cost is the thing a module slot always costs: it
has one occupant. Two providers in one tree settled the same slot and the last
render won; a render React abandoned still wrote; and a test file left its
board standing for the next one, which ten of the twelve modules that mount the
provider never put back.

## Decision

The settled registry is indexed into an `OfflineBoard` — a value. The provider
builds one and hands it down a context beside the config; `useOfflineBoard()`
is what a surface reads, and every lookup takes the board as its first
argument. A reader with no hooks above it takes it from whoever called it: for
a tool call that is `ctx.offlineBoard`, handed down from the panel the way the
scope and the roster already are.

Outside a provider the context answers the package's own board, which is what
the module variable held before anyone wrote to it. A board has a true default
and the config does not, which is why this context has one and the config
context beside it still throws.

## Consequences

**The rule this records is about content, not about hooks.** A value that is
settled once per installation and never changes is handed down; ADR 0005's two
conditions still decide where new STATE goes, and its instance list is
untouched.

**A board belongs to a tree.** Two providers with two registries draw their own
boards, which is the property a module slot could not have and what the test
beside the provider proves.

**Threading is the cost.** Eleven readers gained an argument, and the agent's
tool context gained a field. That is the price of the seam, paid once, and it
is what makes the board a reader draws readable from the call rather than from
whatever last wrote a module.

**The bundled sample and a deployment's board draw identically.** This was a
refactor: `sample.blueprints` takes the same registry or loader, the loader
still resolves once before the board draws, and the generator's output is
unchanged.
