# Audit Playbook

The audit skill's operating manual. The SKILL.md carries the routes and the
hard rules; this file carries the mechanics.

## Contents

- §1 Run semantics
- §1.5 Roster & skips
- §2 Fingerprint
- §3 Dedupe decision table
- §4 Triage route
- §5 Check-authoring template (its Question / Read / Finding shape / Non-findings headings are the template itself)
- §6 Canvas note

## §1 Run semantics

- **One `run_id` per run** (a fresh UUID, minted at dispatch time). It is
  identity for reporting only — there is deliberately no runs table.
- **The export** the auditors share: `audit/export-<scenario>.json` (or
  `export-all.json` for whole-blueprint runs) — a read-only JSON subset of
  the IR scoped to the run, written once at dispatch, deleted or ignored
  after. Auditors read it, never the live IR, so mid-run edits cannot
  split the checks across two realities.
- **Route substrate.** DB reachable (credentials present AND the target
  answers) → findings are DB rows and the partial unique index is the
  backstop. No DB → `audit/findings-report.json` is the ledger: same row
  shape, same dedupe table (§3) applied against the file, and the
  idempotence exit is judged against it. Entry-state precedence follows
  the same test: reachable target = imported-blueprint route, else
  IR-only — a scenario's `drafted`/pending-sign-off status never changes
  the route, it only gets flagged in the report as a staleness note.
- **Per-check atomic supersede.** When check C completes and its deduped
  findings are ready: in ONE transaction, resolve-or-delete C's previous
  `open` findings that this run did not re-detect, and insert/update the
  rest. Prefer flipping undetected-this-run rows to `resolved` over
  deleting them — resolution history is signal. A check that failed or was
  skipped touches nothing.
- **Scoped runs** ("audit Warm-Up only"): the cell universe is that
  scenario's keys. Supersede is then ALSO scoped — only previous findings
  whose `cell_keys` all fall inside the scope are eligible; a scoped run
  must never resolve a finding it could not have re-detected.

## §1.5 Roster & skips

The roster stage ALONE decides which checks run — a dispatched auditor
never re-decides (it may only report that the export contradicts the
dispatch). Wave 1 always runs. Wave-2 rules:

- `kpi-alignment`: skip when no lane in scope carries `kpis`/`tools`.
- `perceived-owner`: skip when no cell carries the owner pair.
- `value-ledger`: skip when no cell carries `value_props`.
- `fee-visibility`: a CONTENT SCAN, not a column test — skip only when no
  money mention exists anywhere in scope (beware substring false
  positives: "fee" in "feedback", 收 as receive, 款 inside 条款).

Every skip is reported with its reason; a silent skip reads as coverage
that never happened.

## §2 Fingerprint

```
fingerprint = check_name + ':' + sha256(join(sort(cell_keys), '\n'))
```

`skills/audit/scripts/audit_tools.py fingerprint` is the reference implementation —
execute it rather than hand-computing (two hand-rolled implementations
that disagree on a separator split the finding history).

- Sorted, so cell order never changes identity.
- `cell_keys` use the qualified key convention
  `<lifecycle>/<phase>/<scenario>/<path>/<layer>/<step>` (the same
  convention slice-schema.json defines; IR cells carry layer+step — the
  rest of the path comes from their position in the tree). On a live
  canvas, cell ids stand in for keys (separate dedupe space, by design).
- The note is NOT part of the fingerprint — rewording a finding updates the
  open row rather than duplicating it.
- Zero-cell findings (e.g. "no scenario covers onboarding at all") use a
  scope key instead of cell keys, WITH a short reason slug so two distinct
  zero-cell findings from one check cannot collide:
  `check_name + ':scope:' + scenario_key + ':' + <reason-slug>`
  (e.g. `gap-sweep:scope:warm-up:orphan-step-cooldown`).
- The DB backstop: `findings_open_fingerprint_idx` — unique on
  `(service_lifecycle_id, fingerprint) where status = 'open'`. An insert
  conflict means the dedupe logic missed; treat it as update-in-place,
  never as "insert with a tweaked fingerprint".

## §3 Dedupe decision table

`skills/audit/scripts/audit_tools.py dedupe` (plan) / `report --apply` (no-DB ledger)
implement this table — execute, never improvise.

| Incoming fingerprint matches… | Action |
| --- | --- |
| nothing | insert `open` |
| an `open` row | update its note/severity/run_id in place |
| a `dismissed` row | drop silently — a human said no; re-detection does not overrule them |
| a `resolved` row | reopen it (status → `open`, new run_id) — it came back |

## §4 Triage route

"Dismiss finding X" / "resolve finding X" / "reopen finding X":

1. Identify the row (by id if given; else by check + cell keys — confirm
   when ambiguous).
2. Update `status` only. Never note, severity, or cells — a triage is a
   human judgement about an agent statement, not an edit of the statement.
3. Confirm back: check, cells, old → new status.
4. Never run checks, never write anything else. If the user ALSO wants the
   underlying issue fixed, that is the `sb:map` skill, after.

Status vocabulary is closed: `open | resolved | dismissed`. `dismissed`
means "true but accepted — do not show me again"; `resolved` means "was
true, fixed — reopen if re-detected".

## §5 Check-authoring template

A check doc is an interrogation an auditor can run blind. Required
sections, in order:

```markdown
# check: <name>
wave: 1|2            # 2 = list the columns it needs; skip-if-empty
severity-default: info|warn|critical

## Question
One sentence, from the customer's or operator's point of view.

## Read
What to read in the export, in what order. Wave-2: name the columns and
the skip condition.

## Finding shape
When to emit; what the cell_keys set is; what the note must contain
(cite keys/titles — never excerpt text); when to raise/lower severity.

## Non-findings
The false positives this check is known to attract, spelled out.
```

Run a new check alone once, read its findings for false-positive rate,
then add it to the roster.

## §6 Canvas note

Inside the uno-blueprint canvas agent the audit is fully live — the
`/sb:audit` row of `references/canvas-adapter.md` is the ONLY canonical
canvas translation (tools, dedupe wiring, pacing, cell-id fingerprints).
Read that row; nothing here overrides it.
