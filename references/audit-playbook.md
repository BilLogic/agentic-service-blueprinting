# Audit Playbook

The audit skill's operating manual. The SKILL.md carries the routes and the
hard rules; this file carries the mechanics.

## §1 Run semantics

- **One `run_id` per run** (a fresh UUID, minted at dispatch time). It is
  identity for reporting only — there is deliberately no runs table.
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

## §2 Fingerprint

```
fingerprint = check_name + ':' + sha256(join(sort(cell_keys), '\n'))
```

- Sorted, so cell order never changes identity.
- The note is NOT part of the fingerprint — rewording a finding updates the
  open row rather than duplicating it.
- Zero-cell findings (e.g. "no scenario covers onboarding at all") use the
  scope key instead of cell keys: `check_name + ':scope:' + scenario_key`.
- The DB backstop: `findings_open_fingerprint_idx` — unique on
  `(service_lifecycle_id, fingerprint) where status = 'open'`. An insert
  conflict means the dedupe logic missed; treat it as update-in-place,
  never as "insert with a tweaked fingerprint".

## §3 Dedupe decision table

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

Inside the uno-blueprint canvas agent, the audit is **fully live**: same
roster, same check docs (via `read_reference`), and findings land as rows
via `record_finding` — fingerprint dedupe included (open updates in place,
dismissed stays dismissed, resolved reopens as a new row). Triage happens
in chat through `set_finding_status`. Two translations differ from the IDE
flow: cell identity uses cell ids (the canvas convention: `cell_keys` are
written as the ids themselves, so canvas and IDE fingerprints are separate
dedupe spaces), and there is no findings report file — `list_findings` is
the ledger. `references/canvas-adapter.md` carries the full translation.
