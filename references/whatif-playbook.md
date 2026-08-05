# Whatif Playbook

The whatif skill's operating manual. SKILL.md carries routes and hard
rules; this file carries the three operations and the promote handoff.

## §1 The variant discipline

A whatif variant is **an IR file in the workspace, never a DB row**:
`whatif/<key>/variant-<scenario>.json`, a copy of the base IR with the
hypothetical applied. The database only ever holds reality plus findings
about it. Comparing variant vs base happens in local dev (the app's
compare view over local files, plan 003 Phase 5); the deploy-safe artifact
is the **comparison markdown** (`whatif/<key>/comparison.md`), which cites
cell keys from both versions and quotes nothing.

Record at analysis time: the base scenario sign-off hash(es). Every
artifact (findings, comparison doc, change request) embeds them — they are
what makes later promotion refusable when the base moved.

## §2 The three operations

**replay** — "run scenario X as if CHANGE were true."
1. Copy base IR → variant; apply the change.
2. Dispatch `impact-tracer` (seed = changed cells) on the BASE export —
   the trace tells you which claims need re-examination.
3. Walk the affected chain in the variant: which cells' content is now
   wrong, which triggers dangle, which lanes gain/lose work.
4. `blueprint-reviewer` (whatif-claim mode) verifies every replay claim
   cites cells that exist in base or variant — unverified claims are cut,
   not hedged.
5. Findings (source=whatif) per broken assumption; comparison.md.

**restage** — "what if this moved frontstage/backstage?" (visibility-line
move). Same pipeline as replay, plus the two named judgements the
comparison MUST address:
- comprehension gain vs etiquette risk (what does the customer now see —
  and should they);
- the reassurance-touchpoint suggestion: when something moves backstage,
  name the EXISTING cell(s) where the customer's residual "is it
  happening?" anxiety must be answered (never invent a new one — that is
  a change-request diff entry, flagged for the human).

**prioritize** — "which 3–5 cells matter most right now?"
Score every cell in scope on three signals, then present the top 3–5 with
per-signal reasoning:
- evidence weight (rows attached; zero rows = assumption — flag it, since
  an assumption-heavy "priority" is really a research task);
- proposition expression (does the cell carry the value the propositions
  claim — value_props where present);
- backstage `needs` chain depth (impact-tracer, reversed: how much
  machinery serves this moment).
Quick-win warnings: cells that look cheap but sit on deep needs-chains
get a "load-bearing" caveat.

## §3 Findings

Same table, `source = 'whatif'`, same fingerprint algorithm as audit
(check_name = `whatif-<operation>-<key>`), same dedupe/triage rules
(audit-playbook §2–§4). Whatif findings never supersede audit findings
and vice versa — fingerprints keep them disjoint by construction.

## §4 Accept → change request

When the human accepts a whatif's recommendation:
1. Emit `changes/<key>.json` conforming to
   `references/change-request-schema.json` — the diff (cell-key
   addressed), affected scenario keys, the base sign-off hashes captured
   at analysis time, and the finding fingerprints it supersedes.
2. Hand off to **map-promote** (the service-blueprinting skill's playbook):
   verify hashes → edit IR → de-sign notice → re-sign → re-import →
   `sweep_orphans.py` → auto-resolve the superseded whatif findings.
3. Whole-request promote only in v1 — no cherry-picking diff entries; a
   partial acceptance is a NEW, smaller whatif.

The staleness guard is absolute: one hash mismatch and promote refuses,
offering re-trace (re-run the whatif on the current base) instead.

## §5 Canvas note

Inside the uno-blueprint canvas agent, whatif runs **read-only analysis**:
replay/restage/prioritize reasoning over `get_blueprint` reads, verdicts
in chat, clearly labeled "whatif analysis (chat-only — no variant, no
recorded findings)". No variant files (no workspace), no DB writes, no
change requests. If the human wants the change made after discussing it,
that is the normal canvas write flow — nod gate, small batches, ledger —
NOT a promote. The IDE flow owns variants, findings, and promotion.
`references/canvas-adapter.md` carries the full translation.
