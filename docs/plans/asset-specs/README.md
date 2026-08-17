---
title: Asset specs — index
type: plan
status: draft-for-review
date: 2026-08-08
---

# Asset specs

One file per figure, each granular enough that drafting is mechanical.
`00-style-guide.md` is the contract — extracted from the four shipped
SVGs — and every spec lists only its deltas and sanctioned deviations.
**`13-diagram-standards.md` is the authority** — the consolidated
requirements, the compliance audit of the current set, and the pre-flight
checklist. `00-style-guide.md` (measured style system) and
`11-copy-and-voice.md` (per-string copy) remain as detail references;
`12-text-vs-visual.md` assigns what the prose says vs. what the figure
shows. Parent plan: `../2026-08-08-002-plan-docs-asset-revamp.md`
(decisions + history); this folder is the execution layer.

## The set, in reading order

Numbered **F1–F11** by the order a reader meets them. Placement revised
2026-08-08: the model and overview figures live in the README; the four
skill figures moved out to guide/03's per-command sections, so the front
door stays about the blueprint and the plugin, not about each command.

| # | Title | File | Appears | Spec | State |
| --- | --- | --- | --- | --- | --- |
| F1 | Why teams need a service blueprint | `why-now.svg` | README §2 | 01 | DRAWN — then/now, participants + read density + content depth |
| F2 | How a blueprint is organized | `data-model-hierarchy.svg` | README §4 | 10 | shipped; background rect added, footer caption cut |
| F3 | Inside a single path | `blueprint-anatomy.svg` | README §4 | 10 | shipped; background rect added, role legend dropped |
| F4 | Inside a single cell | `cell-anatomy.svg` | README §4 | 07 | redraw pending — filled panel + per-section callouts |
| F5 | Types of slices | `slicing-model.svg` | README §4 | 08 | drawn; refocus on the taxonomy pending |
| F6 | Where a blueprint is used | `four-ways-in.svg` | README §5b | 09 | drawn; schematic redraw pending |
| F7 | Overview of the sb skill set and agent fleet | `skill-architecture.svg` | README §6 | 06 | redraw pending — wiring, not an inventory |
| F8 | How to use `sb:map` | `sb-map.svg` | guide/03 · sb:map | 02 | drawn; defines the skill template |
| F9 | How to use `sb:slice` | `sb-slice.svg` | guide/03 · sb:slice | 03 | drawn |
| F10 | How to use `sb:audit` | `sb-audit.svg` | guide/03 · sb:audit | 04 | drawn |
| F11 | How to use `sb:whatif` | `sb-whatif.svg` | guide/03 · sb:whatif | 05 | drawn |

Non-SVG: the hero screenshot (README §3, between F1 and F2) and four
scenario recordings (README §3, linked again from guide/02). `erd.mmd` is
a reference artifact, outside the reading order; regeneration in spec 10.

## Remaining work, in reading order

1. **F4** — redraw as a fully filled panel skeleton with one callout per
   section (F3's idiom); drop the trigger-vs-needs teaching.
2. **F5** — refocus on the five types; postures demoted or cut.
3. **F6** — schematic redraw; idea approved, execution rejected.
4. **F7** — redraw as the wiring of the skill set: each skill with its
   docs and scripts, plus the agent fleet they call on.
5. **Spec 10 remainder** — retire `skill-workflow.svg`, regenerate
   `erd.mmd`, move everything into `docs/assets/`, fix links.

Everything else is drawn and render-checked. Titles, voice rules and the
prose/figure division are settled in specs 11 and 12.

## Resolved decisions

- 01 eval ladder OUT (the case study carries the evidence).
- Set-wide wording: the artifact is a **blueprint**, never a "map"; "map"
  is the skill name or the verb.
- 05 dashed variant-border IN.
- Titles: "Inside …" for anatomy figures, "How to use `sb:…`" for the four
  command figures (command in mono), "Why blueprint" for F1 — no em-dash
  taglines anywhere.
- Body copy: ALL-CAPS section rails, lowercase fragment labels, mono for
  literals, one caption line per figure.
- The surfaces figure kept rather than cut; retitled "Where a blueprint is used" and moved ahead of the plugin figure.
- README carries F1–F7; guide/03 carries F8–F11 (progressive disclosure).
- **Show > tell** is a standing review check on every figure (style guide).
