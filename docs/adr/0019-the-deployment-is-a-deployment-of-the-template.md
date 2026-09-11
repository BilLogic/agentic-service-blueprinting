---
summary: This template is the canonical application code, and a live instance becomes a deployment of it — the same code plus a data, environment, and content overlay — rather than a fork maintained in parallel, because the generic thing must be the base and that instance is already almost entirely data.
---

# 19. The deployment is a deployment of the template, not a fork of it

**Status** Accepted — 2026-09-02. Moved into this repository from
BilLogic/plus-uno-blueprint ADR 0012 on 2026-09-10 (#551); the number
here is this repository's. After the move, "ADR 0012" in this folder is
[a rung owns size and leading](./0012-a-rung-owns-size-and-leading.md);
the record that used that number in the deployment is this one.
**Context** `src/deploymentConfig.ts`, BilLogic/plus-uno-blueprint#304

## Context

Two repositories render the same service blueprint. `agentic-service-blueprinting`
is the publishable template a non-professional installs;
[BilLogic/plus-uno-blueprint](https://github.com/BilLogic/plus-uno-blueprint)
is the live instance this template was generalised from. They began as one
renderer and forked in both directions: the live instance carries roughly the
entity-panel and definition system the template lacked, the template carries
the registry and tech-pill components the live instance lacked, and shared
files have drifted by hundreds of lines — the cell detail panel alone by over
nine hundred. There is no automated sync and no drift check, so an improvement
is authored once and hand-ported to the other, scrubbed of that instance's
names, one ticket at a time — slow, and drift creeps in unseen until someone
measures it (BilLogic/plus-uno-blueprint#304).

The decision: **this template is the canonical source of truth for application
code, and the live instance is a deployment overlay over it** — the same code
plus data, environment, and the content surface that carries that instance's
branding, cover copy, per-kind examples, and blueprint data. Features are
authored template-first (generic) and flow to the deployment; **that instance's
branding and blueprint live entirely in data, never in code.** One edit, both
current, and the template a vibe coder installs is the same code the live
instance runs.

## Why this template is canonical, and not the live instance or a shared third

Three shapes were on the table.

- **Keep forking, hand-port each change** (the status quo). Rejected: it is what
  produced a nine-hundred-line gap no one chose and no one saw until it was
  measured. Every frontend improvement pays the port tax twice, and the drift is
  invisible between measurements.

- **Live instance canonical, template derived.** Rejected on the direction of
  specialization. This template is the generic one; the live instance is the
  *specialized* instance that adds that deployment's content. If the
  specialized instance were the base, its content would be baked into the root
  and the template would forever be "the live instance minus its branding" — a
  subtraction that has to be redone on every change and can never be verified
  complete. The canonical repo must be the one with **no** deployment-specific
  content, so that shipping the template is shipping the base, not un-shipping
  a deployment.

- **Template canonical, live instance a deployment overlay** (chosen). The
  template is the generic base; the live instance is data over it. This is cheap
  precisely because that instance is already about 99% data — after the
  canvas-affordances work (BilLogic/plus-uno-blueprint#301) removed the last
  code that named it (two comments), the instance-specific surface is branding,
  the cover-content module, the workspace title, the per-kind examples
  (BilLogic/plus-uno-blueprint#302), and the blueprint rows. The backend is
  already replayable this way — the portable core plus the Supabase recipe plus
  a generated seed stand up on a fresh database — so this brings the frontend
  to a standard the backend already meets.

## Why "the live instance as data, never code"

The overlay is only sound if the boundary is enforceable. Branding, the
cover-content module, the workspace title, the per-kind examples, and the
blueprint data are all data or config; no instance-specific reference ships in
the canonical code. This template's existing standalone check already enforces
this, and it extends to the whole canonical set. A deployer's content then
survives a code upgrade untouched, because the upgrade never reaches it — the
same property that lets the seed carry a deployment's blueprint without a
deployment-specific line in the schema.

## Consequences

- **Authoring inverts to template-first.** Once converged, a feature is written
  generic in the canonical repo and flows to the deployment; the live instance
  is run locally against real data to feel a change against real content, but
  the change is authored in the template. This is the opposite of the status
  quo at the time of writing, where the live instance led and the template
  lagged — and it is why the instance-first fixes
  (BilLogic/plus-uno-blueprint#301, BilLogic/plus-uno-blueprint#302) were sequenced to land *before*
  convergence: converge a stable instance, not one still being fixed.

- **Reconciliation is the bulk of the work, and it is a union, not a rewrite.**
  The divergence is drift we created plus a component-set union: port the live
  instance's entity-panel and definition system into the canonical code, fold
  this template's registry and tech components in, reconcile each drifted
  shared file to one implementation, and finish the vocabulary alignment so the
  same concept is not two words in two repos.

- **A drift check makes divergence loud.** A parity check fails when shared code
  diverges between the canonical repo and the deployment overlay, so drift is
  surfaced on every change rather than discovered by accident. Its backend
  companion is a "seed loads on a fresh core" check, so the documented
  vibe-coder setup path is guarded the same way.

- **The standalone check is now load-bearing for both repos**, not just this
  template — it is the mechanism that keeps a deployment's identity out of the
  canonical code, so weakening it re-opens the fork.

## Still open — the sync mechanism is a separate decision

> **Resolved by [ADR 0020](./0020-the-deployment-imports-the-template.md).** The
> section below records what this decision deliberately left open, and is kept
> as written. The answer is: a git dependency pinned by release tag, mounted
> through a typed `DeploymentConfig` prop — the "shared package" lean below,
> taken without publishing to a registry.

This ADR records *that* the live instance consumes the canonical code as an
overlay. It does **not** decide *how* the deployment consumes it — git subtree,
git submodule, or a shared published package — which is a genuine trade-off
deserving its own ADR before the reconciliation begins:

- **subtree** — the canonical code is vendored into the deployment; a plain
  checkout, no extra clone step, but upstream merges are a manual subtree pull.
- **submodule** — a pinned upstream ref, cleanest separation, but real
  contributor friction (detached HEAD, an extra init/clone, easy to forget to
  bump).
- **shared package** — versioned upgrades with ordinary dependency semantics,
  but it requires publishing the app as an installable shell and is the heaviest
  upfront.

Recorded lean, not decided: a shared package extends the model already in place
— the live instance pulls this template in as a git dependency today for the IR
schema and seed generator (the `entity_examples` round-trip in
BilLogic/plus-uno-blueprint#313 rides exactly that seam) — and gives the same
versioned-upgrade story the backend template already has. But this is a
separate call and gets its own ADR.
