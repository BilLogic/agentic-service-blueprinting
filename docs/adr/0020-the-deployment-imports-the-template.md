---
summary: The deployment consumes the canonical template by importing it as a pinned-by-release-tag git dependency and mounting its whole app through a typed DeploymentConfig prop — never by vendoring or editing the code in place — so that drift is structurally impossible and an upgrade is a reviewable tag bump.
---

# 20. The deployment imports the template, and never edits it

**Status** Accepted — 2026-09-02. Moved into this repository from
BilLogic/plus-uno-blueprint ADR 0013 on 2026-09-10 (#551); the number
here is this repository's. After the move, "ADR 0013" in this folder is
[TypeScript owns layout numbers](./0013-typescript-owns-layout-numbers.md);
the record that used that number in the deployment is this one.
**Context** `src/deploymentConfig.ts`,
[ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md)

## Context

[ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md) (BilLogic/plus-uno-blueprint
ADR 0012 at the time it was written) settled that `agentic-service-blueprinting`
is the canonical application code and the live instance is a deployment over
it, and deliberately left *how* the deployment consumes that code to its own
record. This is that record. Four choices, each downstream of the last:

1. **Import, not overlay.** The deployment takes this template as a
   **dependency it imports**, not code vendored (git subtree) or nested (git
   submodule) inside it.
2. **A git dependency, pinned by release tag.** The dependency is a git ref —
   the mechanism the live instance already runs for this template's IR schema
   and seed generator (`agentic-service-blueprinting#v0.5.0`), not a package
   published to a registry — pinned to a **release tag**, with a commit SHA as
   the escape hatch for an urgent hotfix between releases.
3. **The whole app, not a component library.** This template exports a
   **mountable application** — root, routing, data layer, agent, auth wiring —
   and the live instance is a razor-thin deployment, not an app shell that
   imports this template's components.
4. **Mounted through a `DeploymentConfig` prop.** The deployment's entry
   renders `<App config={deploymentConfig} />`; this template owns the typed
   `DeploymentConfig`. The config carries the deployment's **content** (cover
   copy, workspace title) and a **minimal brand block** (name, logo, accent).
   Secrets (the Supabase URL and anon key) stay in **env**; the blueprint rows
   and the per-kind examples stay in the **database**.

## Why import, and not subtree or submodule

The overlay shapes let the live instance hold this template's code and put its
own identity on top of it. A **subtree** vendors the code editable in place, so
the deployment *can* change canonical files — which is exactly the drift
[ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md) exists to
end, now guarded only by a check and a habit. A **submodule** pins but nests a
second checkout inside the deployment, with the familiar contributor friction
(detached HEAD, a forgotten init, an un-bumped ref) and no gain over a
dependency. **Importing** makes the guarantee structural instead of
disciplinary: the deployment cannot edit what it imports, so a change to shared
code either lands upstream in the canonical repo or it does not land at all.
Drift stops being something a check catches and becomes something the shape
forbids.

A published npm package would give the same guarantee, but at the cost of a
registry and a release-publish step for no benefit the deployment needs: a
**git dependency** is free, is already how the live instance consumes this
template's non-app code, and pins just as hard.

## Why the whole app, and not a component library

A component library — this template exports components and hooks, the
deployment keeps its own `main`, providers, routing, Supabase client and
content module — leaves the deployment **owning the app shell**. That shell
(the editor shell, the provider tree, the shell/canvas clocks of
[ADR 0007](./0007-the-canvas-and-the-shell-run-on-separate-clocks.md), which
was BilLogic/plus-uno-blueprint ADR 0010 when this record was written) is
precisely the shared surface that drifted nine hundred lines in the first
place. Keeping it in the deployment keeps the drift surface live and the
[ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md) guarantee
half-real. Exporting the **whole app** pushes that shell into the canonical
repo and leaves the deployment holding only config, env, and its own database
— the only version in which "it is a deployment" is literally true and the
re-drift surface is near zero.

## Why a config prop, and not an alias module

This template could read its per-deployment values from a well-known module
path that the deployment supplies through a Vite alias or a package export
override. That hides the contract in build configuration — implicit, and
unchecked across the boundary. A **typed `DeploymentConfig` passed to the
mounted root** puts the contract where it belongs: a single visible boundary
this template declares and the deployment fills, type-checked at the mount
point, and trivially faked in a test. The one place the two repos meet should
be the most legible line in the system, not the most magic.

## Consequences

- **This template grows a public surface it did not have: a mountable `App`
  and a `DeploymentConfig` type.** Everything deployment-specific — content,
  the brand block — is parameterized behind that type; everything else is this
  template's to change without the deployment's involvement.

- **This is adopted at the *end* of convergence, not the start.** The live
  instance can only import the app once this template can render everything
  it renders today — so the reconciliation of
  [ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md)
  (porting the live instance's entity-panel and definition system into
  canonical, folding this template's registry in, reconciling drift) must
  land first. The import is the last step that flips the live instance from
  a fork to a deployment, not the first.

- **Upgrades become a reviewable tag bump.** Moving the deployment to a new
  template release is a PR that changes one ref; a red template release
  cannot reach that instance's production until the deployment chooses to
  pull it. This is the deliberate cost of the pin from
  [ADR 0019](./0019-the-deployment-is-a-deployment-of-the-template.md)'s
  sibling reasoning — zero-lag convergence is traded away for a gate on what
  reaches prod.

- **The split is fixed: secrets in env, rows in the database, copy and brand
  in the config.** A deployer stands up their own Supabase (the portable core
  plus recipe plus seed), sets two env values, and writes a small config
  module — and never touches code. The `entity_examples` git-dep seam
  (BilLogic/plus-uno-blueprint#313) is the same import extended from the seed
  generator to the app.

- **The brand block stays small on purpose** — name, logo, accent, not a theme
  engine. A richer theme can arrive later behind the same `DeploymentConfig`
  seam without changing this decision.

## What the reconciled set covers on the way there

The import is the last step, and until it lands the drift gate
(`scripts/reconciled-files.mjs` in the deployment) is what holds the two
copies together. Which files belong on it is not a separate decision — it is
the split above, applied early: **application code is this template's, so it
enrols; data, environment and branding are the deployment's, so they do not.**

Three cases were argued and are recorded because the answer is not obvious from
the file alone:

- **Build and tooling config enrols.** `eslint.config.js`, `tsconfig.node.json`
  and `vite.config.ts` are code, not environment. Environment is the VALUES a
  build reads — the secrets and URLs the split above puts in env — not the
  build that reads them. `vite.config.ts` is the one that reads as a deployment
  file and is not: if this deployment ever needs a build difference, this ADR
  already says it may not edit the template's code, so the difference has to
  arrive as a seam the template offers. Enrolling the file is what forces that
  conversation instead of letting a quiet local edit stand in for it.

- **Branding does not enrol, even when it is identical.** `public/favicon.svg`
  matches the template's byte for byte today, and that is because this
  deployment has not branded itself yet rather than because the icon is shared.
  Enrolling it would mean the deployment could not choose its own icon without
  changing the template's — which is the same mistake as taking the template's
  `index.html` title or its Supabase project id.

- **A migration never enrols, however identical.** The two repositories do not
  share a migration series — that is why a migration filename is a forbidden
  citation in a shared file. One file matching on both sides is a coincidence,
  and enrolling it would assert a shared series that does not exist.

The rule this leaves is short enough to apply without re-reading the argument:
**if a difference would be a difference in the template's behaviour, the file
enrols; if it would be a difference in this deployment's identity, values or
content, it does not.**

## Still open

Nothing that blocks BilLogic/plus-uno-blueprint#304. The brand block's exact
fields and a richer theme are deferred by design and need no record until they
are built.
