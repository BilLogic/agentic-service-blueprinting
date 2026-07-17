# Co-create Playbook — nothing (or system-only docs) → IR

For when there is no journey documentation: a founder with nothing written,
or an org whose docs describe the *system* (the ingest playbook's mandatory
pivot lands here, with those docs as reference material — never as source
truth for journey structure).

## Posture

This is a conversation, not a form. The full question script with exact
wording lives in `references/elicitation-protocol.md` — follow its order but
keep it dialogic: reflect back what you heard, propose structure, let the
user correct. The user is the source of truth; you are the notation.

## 1. Right-size first (⚠ do this before any lifecycle ceremony)

The elicitation protocol's opening branch:

- **Single flow?** ("I just want to map how refunds work") → auto-wrap in a
  default lifecycle + one phase, skip straight to the scenario questions.
  A founder mapping one flow must not sit through lifecycle taxonomy.
- **Huge multi-actor journey?** → chunk it: outline all scenarios, then
  build **one scenario per session**, tracked per-scenario in
  `blueprint-workspace.json`. Partial completion (2 of 6 now) is first-class.
- **In between** → the standard order: lifecycle → phases → scenarios.

## 2. The spine question

Ask explicitly: **"Whose journey is the spine?"** — the actor whose lane gets
`customer_actions` and anchors the interaction line. B2B multi-stakeholder
and internal-ops blueprints make this genuinely non-obvious, and "no spine"
is a legal answer (no `customer_actions` lane, no interaction line — see
`references/layer-roles.md`).

## 3. Skeleton preview

Same rule as ingestion: propose the outline (lifecycle → phases → scenarios,
then per-scenario: actors/lanes, step columns, path variants) as markdown
and get agreement **before** writing IR. Structure mistakes are cheap here,
expensive later.

## 4. Build one scenario at a time

Per scenario, in this order (mirrors the elicitation protocol):

1. Steps — the columns, in order. Start with the happy path's sequence.
2. Lanes — actors + tech + support; assign roles explicitly
   (`references/layer-roles.md`); reference docs may suggest system names
   for tech lanes.
3. Cells — walk the grid lane by lane; empty cells are fine and normal.
4. Paths — after the happy path exists, ask what goes wrong / what's the
   workaround; alternative/exception paths reuse scenario steps via
   `path_steps` and may add their own.
5. Triggers — "what kicks off what?" — only where arrows genuinely add
   information (same-path only).
6. Locales — if bilingual, capture both languages as you go (locale maps),
   don't bolt translation on later; flag domain terms for review.

After each scenario: run `scripts/validate_ir.py`, fix to exit 0, mark
`drafted` in `blueprint-workspace.json`, and offer to stop or continue —
respect the chunking decision from step 1.

Content elicited from conversation carries no `provenance` (there is no
source doc); if the user cites a document for a specific claim, record it.
Mark genuinely unconfirmed guesses `needs_review: true`.

Then hand off to `references/review-import-playbook.md`.

## ⚠ Exit condition (deterministic)

Identical to ingestion: a scenario's co-creation loop ends when
**`scripts/validate_ir.py` exits 0 AND the scenario is marked `drafted` in
`blueprint-workspace.json`**. The phase ends when every scenario the user
committed to in this session meets that condition — not when the
conversation feels finished.
