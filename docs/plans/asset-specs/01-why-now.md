---
title: Asset spec — why-now.svg
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/why-now.svg
home: README §2 (inline); reusable in the PLUS case study and talks
style: 00-style-guide.md governs
---

# why-now.svg — the thesis

## Job

Answers: *why does this exist, and why now?* Two strands converge: agents
need a model of the whole service; service design has long practiced
building exactly that for humans. The only figure allowed ideas without UI.

## Canvas

`viewBox="0 -44 880 464"`. Title: **"Why a blueprint, why now"**.

## Layout

Three zones, left → right, using the column grammar:

- **Strand bands** (x=16, w=380, two stacked panels h=150, 24px gap):
  - Top panel, rail label **"AGENTS JOIN THE TEAM"** (amber-tinted tab):
    a small doc-pile stack (depth idiom, 3 offset rects with `.mono`
    corner titles `prd.md`, `notion export`, `figjam`) + `.sub` lines:
    "each document describes a part," / "none describe the service".
    Pink annotation chip (`#fbe9f0`): "confidently wrong — an aspirational
    doc read as current fact".
  - Bottom panel, rail label **"SERVICE DESIGN PRACTICE"** (green-tinted
    tab): mini-grid quote (dimmed anatomy tints, ~120×70) + `.sub` lines:
    "one map of the whole journey —" / "frontstage and the work behind
    it". Annotation: "rich but heavy — consulted a few times a year".
- **Convergence node** (x≈470, centered vertically): emphasis card
  (`#d9e4ea`/`#9aadbe`, rx=14, ~170×64), `.title` "the blueprint, as
  structured data", `.sub` beneath "a poster becomes a database". Two
  Bézier edges in from the strand panels (marker per style guide); edge
  labels in white pills: "needs this model" (top), "already draws it"
  (bottom).
- **Consumers** (x≈700): two 44h cards stacked — "the team" (white) and
  "its agents" (white, amber stroke) — one straight edge each from the
  node; a shared CAPS label above the pair: "ONE SHARED LENS".

Footer `.sub` centered @10px: "the agent consults the whole blueprint on
every question — no workshop required".

## Eval ladder — RESOLVED: OUT (Bill, 2026-08-08)

Keep the figure clean; the case study carries the evidence. Do not draw
the ladder pills.

## Consistency notes

- Only figure with zero UI mocks and zero process rails — rhetoric budget
  spent here alone.
- Wording is the SOFTENED register (never "already solved"; "has long
  practiced" / "already draws it").
- Strand tabs use amber/green with their fixed meanings (automation /
  human practice) — consistent with the tint table, not decorative.
