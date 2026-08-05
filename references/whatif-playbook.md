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

Record at analysis time: the base sign-off hash. v1 workspace state
records ONE whole-file `sign_off.content_hash` (there are no per-scenario
hashes) — embed it under the key `__file__` in `base_signoff_hashes`.
Every artifact (findings, comparison doc, change request) embeds it —
that is what makes later promotion refusable when the base moved.

The zero-verbatim-excerpts exit is a defined grep test: no run of ≥6
consecutive source words (≥8 consecutive CJK characters) from any
in-scope cell may appear in comparison.md.

No-DB route: when no database is reachable, findings rows land in the
workspace's `audit/findings-report.json` (the same row shape and dedupe
rules as audit-playbook §2–§3, `source=whatif`) — that file IS the ledger
on this route, and the findings exit condition is met by it.

## §2 The three operations

**replay** — "run scenario X as if CHANGE were true."
1. Copy base IR → variant; apply the change.
2. Dispatch `impact-tracer` (seed = changed cells) on the BASE export —
   the trace tells you which claims need re-examination. (IR exports
   carry only `trigger` edges — `needs` exists only as a dependency kind
   in DB-backed deployments; when absent, the tracer walks triggers only
   and says so in its output.)
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
2. Then STOP and tell the user to invoke sb:map (map-promote) — never
   chain into promotion in the same turn; the gap between accept and
   promote is a human gate. Map-promote's steps for reference:
   verify hashes → edit IR → de-sign notice → re-sign → re-import →
   `sweep_orphans.py` → auto-resolve the superseded whatif findings.
3. Whole-request promote only in v1 — no cherry-picking diff entries; a
   partial acceptance is a NEW, smaller whatif.

The staleness guard is absolute, and the comparison is TWO checks, both
against defined targets: (a) each embedded `base_signoff_hashes` value
must equal the workspace's RECORDED `sign_off.content_hash`, and (b) the
recorded hash must equal a RECOMPUTED hash of the IR file. One mismatch
in (a) = base re-signed since analysis → refuse, offer re-trace. A
mismatch in (b) = the base itself carries unsigned edits → refuse with
"re-sign first" (promoting onto a dirty base is promoting onto an
unreviewed one). Never compare against only the recorded value.

## §5 Canvas note

Inside the uno-blueprint canvas agent, whatif is **fully live** with two
translations. (1) The variant is conversational, not a file: analysis
still never touches the blueprint — replay/restage/prioritize reason over
`get_blueprint` reads, and consequence findings land via `record_finding`
(source `whatif`). (2) Promotion is direct: when the human accepts, there
is no change-request file — the agent applies the accepted diff through
the ordinary canvas write tools under the ordinary discipline (nod gate,
small batches, ledger, revertible), then resolves the superseded whatif
findings via `set_finding_status`. Staleness is handled by liveness: the
canvas writes against current rows with optimistic-concurrency tokens, so
a stale base fails loudly instead of needing a hash guard.
`references/canvas-adapter.md` carries the full translation.
