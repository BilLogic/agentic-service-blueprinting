---
summary: The build's application alias stops pointing at one root and becomes an overlay resolved per path — the deployment's copy of a path if it exists, else the package's — so a deployment can delete a file the moment it matches; the files it still holds are its residents, and a residents list naming every one of them with a reason is the gate that replaces the reconciled-files drift check.
---

# 22. The deployment overlays the package per path, and a residents list is the gate

**Status** Accepted — 2026-09-13 (#700). Amends
[ADR 0020](./0020-the-deployment-imports-the-template.md).
**Context** `vite.config.ts`, `scripts/overlay.mjs`,
[ADR 0020](./0020-the-deployment-imports-the-template.md),
[ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md)

## Context

[ADR 0020](./0020-the-deployment-imports-the-template.md) settled that a
deployment imports this template rather than vendoring it, and the build
config it shares with the deployment is what decides where the application
comes from. That decision was made per ROOT: the `@` alias pointed at the
first of `./src` and `./node_modules/agentic-service-blueprinting/src` that
existed, and the loser was never consulted. So a deployment's `src` was ALL OR
NOTHING — a `src` holding one file captured every `@/…` import and resolved
none of the rest.

The rule existed because of what an alias is. Vite's `resolve.alias` maps a
prefix to **one directory**; there is no second place for it to look, so a
config that has two candidate roots and one alias has to choose between them
before it sees a single import. Choosing the first that exists is the only
answer that needs nothing but the disk, which is what the shared-bytes
constraint of [ADR 0020](./0020-the-deployment-imports-the-template.md)
demands: the same `vite.config.ts` serves this repository and the deployment,
so the branch cannot be an edit.

What it cost was the shape of convergence. The deployment could not delete a
file the moment that file matched the package's — deleting one file left the
root present and therefore still the whole answer, and deleting all of `src`
at once was only safe once EVERY file matched. So enrolment could not be
deletion. It was a copy held byte-identical by a drift check
(`scripts/reconciled-files.mjs` in the deployment, the gate
[ADR 0020](./0020-the-deployment-imports-the-template.md) describes), which
means the reconciled set grew with every file that converged and shrank only
on the last day. A gate that cannot let go of a file it has finished with is a
gate that ends up holding the whole application.

TypeScript never had this problem. Its `paths` list carries both roots and
falls back per MODULE, so the compiler has been resolving the overlay's rule
since the pair was first written down — the build was the only side of the
pair that could not.

## The decision

**The application alias is an overlay, resolved per path.** When the package
is installed, the package's `src` is the application and the deployment's `src`
is an overlay laid over it: for a path under the alias, the deployment's copy
answers if it exists, else the package's. That is TypeScript's rule, applied
by the bundler. When the package is not installed — this repository — `src` is
the application, there is no second layer, and nothing below is reached.

**One resolver, shared by the build and the walks.** `scripts/overlay.mjs`
exports the rule twice over: `resolveOverlaid(relativePath, layers, exists?)`
is the rule as a function of paths and an `exists`, taking the layers
overlay-first and the package last and answering with the file, the layer that
held it, and whether it was found at all; `overlayPlugin({ layers })` is the
same rule as a Vite plugin, enforced
`pre`, intercepting ids the alias has already rewritten into the package's
root. Neither names a root — where the roots are is the build config's fact.
The package exports the module as `agentic-service-blueprinting/overlay` and
`vite.config.ts` imports it **by package name**, which is the one spelling
that resolves on both sides: out of `node_modules` in a deployment, and by
self-reference here. It is imported only when the package is installed, so
this template's own build is unchanged by all of it.

**A residents list is the gate.** The files a deployment still keeps in `src`
are its **residents**, and each one shadows a package file at the same path.
Every resident is listed with a reason: **owned**, or **diverged with a
ticket**. CI fails on a resident that is not listed, and on a diverged
resident with no ticket. That list replaces the deployment's reconciled-files
gate: the old gate asked "do these copies still match?", the new one asks "why
does this copy exist?", which is the question that has an end. The list itself
is built in a later ticket — #702 ("Owned deployment inputs have config
homes") and the deployment's own follow-up; this record is the decision, not
the implementation.

**The `~` root stays, and stays separate.** A deployment's own files — its
config module, its content, whatever else it authors — are not residents and
do not go in `src`. A file in `src` stands for a package file of the same
path, and a file that stands for nothing is a resident with no reason to be
one. They live in `deployment/` under the `~` alias, so an import says at a
glance which side it is on: `@/…` is the application, whichever layer answers,
and `~/…` is the deployment's own.

**A path is one module, however it was reached.** The plugin overlays every
id under the package's root — an import the alias rewrote and a relative
import inside the package (`./blueprintLaneCollapse` from a package module)
arrive as the same absolute path, and both answer with the resident. The
other rule, overlaying only what the alias reached, would load the resident
for the deployment's imports and the package's copy for the package's own:
two instances of one module, and every module-level store
([ADR 0005](./0005-cross-surface-state-is-a-module-store.md)) split between
them. It is also what the deployment's build did before this decision, when
`src` was the whole alias. The cost is stated rather than hidden: TypeScript
resolves a package module's relative import to the package's file, so a
diverged resident has to keep the exported interface of the file it stands
for, and the residents list is where a diverged entry answers for that.

## Why not the alternatives

**Keep all-or-nothing and flip at once.** The deployment converges file by
file and then, on one day, deletes `src` entirely. This is the status quo and
it works; what it costs is that every converged file stays enrolled in the
drift gate until the last one converges, so the gate is heaviest exactly when
the work is nearly done, and a single unconverged file keeps the whole copy
alive. It also makes the flip a change with no small version of itself — the
one shape [ADR 0017](./0017-large-component-splits-wait-for-an-end-to-end-round.md)
records this estate learning to distrust.

**A per-module fallback in the alias alone.** Vite's alias accepts a
`customResolver`, so the fallback could live in `vite.config.ts` with no
shared module and no list. That gets the resolution right and leaves the
reporting nowhere: a file in `src` would quietly shadow the package's file at
the same path, forever, with nothing saying it was there or why. Path
shadowing that nothing reports is the drift of
[ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md) with the
evidence removed — the copy still differs, and now no check names it. That is
exactly what the residents list answers: every shadow is listed, and every
listing carries a reason. The resolver is also needed outside the config, by
the walks, and a `customResolver` closed over the config's scope cannot be
called from a script.

## Consequences

- **Enrolment becomes deletion.** A file the deployment has finished with is
  removed from its `src`, and the package answers for that path from then on.
  There is no copy left to hold byte-identical and nothing to add to a gate —
  the absence IS the enrolment.

- **A resident is a listed, reasoned shadow.** Holding a file is allowed and
  visible: owned, or diverged with a ticket that says when it stops being
  diverged. What is not allowed is holding one silently, which is the state
  the alias made unreportable.

- **The walk has to follow the build.** A check that sweeps the application
  must land on the files the build resolves, or it is measuring a tree nobody
  ships. `scripts/app-source.mjs` still answers with the first root that
  exists, which agrees with the overlay at both ends — this repository (no
  package, one root), a deployment with no residents (the package answers
  every path), and the deployment as it stands today, where every file is
  still a resident and `src` answers every path — and disagrees only in
  between, once the first resident is deleted. The sweep module takes the
  shared resolver in #703, before that deletion; until it does, the
  ALL-OR-NOTHING paragraph that used to justify the walk is withdrawn in
  place.

- **The deployment's all-or-nothing comment is superseded.** BilLogic/plus-uno-blueprint's
  `vite.config.ts` still carries the comment that begins "`src` is ALL OR
  NOTHING" and ends "Do not half-vendor one". This decision supersedes it. The deployment
  takes the new text at its pin bump, with the rest of the file, because that
  file is one it holds byte-identical to this template's — which is the same
  reason the decision had to be made here.

- **The deployment's reconciled-files check is replaced, not merely relaxed.**
  The residents check is its successor and lands in the deployment's own
  follow-up; the reconciled set retires when it does, and
  [ADR 0020](./0020-the-deployment-imports-the-template.md)'s account of what
  that set covers is marked superseded in place rather than deleted, because
  the argument it makes — application code is the template's, identity and
  values are the deployment's — is the argument the residents list's reasons
  are still drawn from.

## Still open

The residents check itself lands in the deployment, not here: this repository
has no residents and nothing for such a check to read. The sweep's use of
`resolveOverlaid` is #703, and until it lands `scripts/app-source.mjs` and the
build agree on every tree that exists — no residents, or every file a resident,
which is the deployment today — and would disagree only on a deployment part
way through deleting them, which is the state #703 has to land before.
