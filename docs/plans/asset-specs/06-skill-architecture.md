---
title: Asset spec — skill-architecture.svg (total redraw)
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/skill-architecture.svg (replaces shipped file)
home: guide/03 §2 only (leaves the README)
style: 00-style-guide.md governs
prerequisite: re-inventory the tree at draft time; all counts from the generator script
---

# skill-architecture.svg — how the plugin is put together

## Job

Answers: *what's in the package and how do the parts relate?* For the
adopter about to install and the engineer extending. Matches the 0.3.0
**per-skill resource layout** — the shipped figure's central-references
column no longer exists in reality.

## Canvas

`viewBox="0 -36 880 560"`. Title: **"How the sb plugin is put together"**.

## Layout — hub and spokes

- **Row 1 — four skill cards** (x per workflow's 4-column pitch:
  112/304/496/688, w=168, h=54, rx=14, amber tint `#fdf1e3`/`#d4b483`):
  `.title mono` sb:map / sb:slice / sb:audit / sb:whatif, `.sub` one
  firing line each: "create, import, evolve" · "cut stakeholder views" ·
  "run the check roster" · "trace a change first".
- **Row 2 — each skill's own stack** hanging beneath its card (the depth
  idiom at (+6,-6), front rect white): `.chip mono` rows `SKILL.md` ·
  `references/ ×N` · `scripts/ ×N` (rows present only where the dir
  exists; counts generated). 26px list pitch inside.
- **Row 3 — shared foundation panel** (full content width, x=16 w=848
  h≈120, rx=12, blue-tinted `#e9eff4` tab: `SHARED REFERENCES — EVERY
  SKILL DRAWS ON THESE`): 8 `.mono` list chips in two columns of four
  (adapter-contract · canvas-adapter · data-model · ir-schema ·
  layer-roles · lane-vocabulary · customization · audit-playbook — verify
  list at draft). Four thin `.edge` Béziers drop from the skill stacks
  into this panel's top edge.
- **Row 4 — agents strip**: CAPS label `AGENTS — FRESH CONTEXT,
  DELIBERATELY BLIND`, five 44h white cards in a row (document-reader ·
  blueprint-reviewer · auditor · impact-tracer · render-checker), `.sub`
  one line each ("reads sources, returns structure" · "attacks the draft
  before sign-off" · "one blind auditor per check" · "walks the ripple,
  depth-capped" · "walks the deployed app"). Top-right micro-badge on the
  strip: `×5`.
- **Footer band**: hooks as three 22h chips (session status · validate on
  edit · secret guard) + centered `.sub` @10px: "one source of truth, two
  consumers — the IDE plugin and the canvas agent read the same files".

## Consistency notes

- Column pitch, card sizes, list rows, stack idiom, edge Béziers all
  verbatim from the shipped architecture figure — only the TOPOLOGY
  changes (hub-and-spokes replaces three columns).
- Every count (`×N`) generated; the drafting commit includes the
  generator run output in its message for review.
- Agent one-liners reuse shipped voice ("walks the deployed app" is a
  shipped string — keep it).
