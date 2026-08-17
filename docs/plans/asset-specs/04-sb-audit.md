---
title: Asset spec — sb-audit.svg
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/sb-audit.svg
home: README §6; guide/03 re-embed
style: 00-style-guide.md + the template in 02-sb-map.md govern
---

# sb-audit.svg — a drifting map → a triage list

## Job

Answers: *what does sb:audit do for me?* Drift becomes findings you can
work through. Textbook grounding: touchpoints pushing in opposite
directions; the gaps everyone thought somebody else was responsible for.

## Template deltas only

- Title: **"sb:audit — is the blueprint still true?"** (RESOLVED, Bill
  2026-08-08: plain register; and never call the artifact a "map" — it's
  a blueprint. That wording rule applies set-wide.)
- LEFT tab: `A BLUEPRINT THAT'S DRIFTING`. Contents: mini-grid quote (~260×150,
  dimmed) with exactly three decodable trouble marks, each with a leader
  line to a `.sub` label at the left rail (anatomy's left-rail caption
  idiom):
  - two cells with opposing arrows → "two touchpoints push in opposite
    directions"
  - an empty lane run (three vacant cells outlined `#e2e4e9`) → "a lane
    nobody filled in"
  - one cell in de-emphasis fill (`#eceef2`) → "a step that no longer
    matches reality"
- Skill chip: **sb:audit** · `.sub` "check it still holds".
- Guardrail CAPS: `BLIND CHECKS · DEDUPED · NOTHING AUTO-FIXED`.
- RIGHT tab: `FINDINGS YOU TRIAGE`. Contents: three 22h list rows
  (rx=5, 26px pitch) with severity dot + `.chip` text + status pill:
  - pink dot · "channel conflict — app says self-serve, call script says
    visit the store" · pill `open`
  - pink dot · "gap — no backstage action behind the sms promise" ·
    pill `open`
  - neutral dot · "stale — pricing step predates the new flow" ·
    pill `resolved` (green pill `#cfe6d9`)
  Beneath, dimmed overflow row: `+ 4 more from this run` (style-guide
  overflow idiom).
- Caption: "the gaps everyone thought somebody else owned, surfaced as
  findings you work through"

## Consistency notes

- The three left-panel marks MUST be decodable without the labels at
  thumbnail size — test by shrinking to 50%.
- Finding rows are the figure's voice test: lowercase, em-dash pattern,
  concrete but generic (no uno/Ecoeled content).
- Pink appears only on trouble (marks + open dots) — nowhere else.
