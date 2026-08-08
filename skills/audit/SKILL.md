---
name: audit
description: Runs consistency checks over an imported service blueprint and records what they find as triageable findings — gaps a scenario never covers, jargon customers would not say, channel conflicts, KPI drift, ownership mismatches, value dead-ends, invisible fees. Use when the user asks to "audit the blueprint", "check Warm-Up for gaps/inconsistencies", "what's wrong with this scenario", "re-run the checks", "sanity check my blueprint", "health check", "is my blueprint consistent", or wants a finding dismissed or resolved ("that jargon one is fine, dismiss it"). Requires an imported blueprint — for building or importing one, use the sb:map skill; for hypothetical changes, use sb:whatif.
---

# Blueprint Audit

A blueprint that is merely *valid* can still be *wrong*: a lane nobody
staffs, a step customers experience but no cell records, a fee the journey
never shows. The audit runs a fixed roster of **checks** — each a written
interrogation, each executed by a fresh-context auditor — and lands the
results as `findings` rows a human can triage. The audit never fixes
anything: it points, with severities, at cells by key.

All `references/`, `agents/`, and `scripts/` paths live at the plugin root
(`${CLAUDE_PLUGIN_ROOT}`); a scaffolded workspace carries the same files
(workspaces scaffolded before this skill shipped may lack them — fall back
to the plugin root, and suggest the upgrade recipe in
`references/customization.md`).

## Entry-state detection (do this first)

| Entry state | Route |
| --- | --- |
| No workspace / no IR | Stop. Nothing to audit — that is the `sb:map` skill's job |
| IR exists, no DB reachable | Audit the IR files directly; `audit/findings-report.json` is the ledger (playbook §1 route substrate) |
| Imported blueprint, DB reachable | Full run: roster → auditors → dedupe → findings rows |
| "Audit just scenario X" | Same pipeline, cell universe scoped to that scenario's keys |
| "Dismiss / resolve finding X" | **Triage route** — status change only, playbook §4. Never re-run checks to honor a triage ask |
| Re-run after edits | Full run; supersede semantics below make it safe |
| "Add a new check" | Author a `references/check-*.md` from the template in playbook §5, then run it alone once before adding it to the roster |

Row precedence when the first three could overlap: DB reachability decides
(credentials present AND the target answers) — per-scenario draft status
never changes the route, only lands as a staleness note in the report.

**Playbook gating**: read `references/audit-playbook.md` before executing
any route. It carries the run semantics, the fingerprint algorithm, the
triage rules, and the check-authoring template.

## Hard rules

- ⚠ **REQUIRED — the audit writes `findings` rows and nothing else.** Never
  cells, never structure, never a "quick fix while I'm here". Humans may
  change only `findings.status`; the audit may supersede only its own
  check's open findings.
- ⚠ **REQUIRED — one fresh-context auditor per check, blind.** Each
  `agents/auditor.md` dispatch gets ONE check doc and the blueprint export,
  and never sees other checks' output. Cross-check synthesis happens in the
  main context after all auditors return.
- ⚠ **REQUIRED — dedupe by fingerprint; dismissed stays dismissed.**
  `fingerprint = check_name + ':' + sha256 of the sorted cell_keys joined
  with '\n'` (exact form: playbook §2). A
  re-detected finding whose fingerprint matches a `dismissed` row is
  dropped silently; matching a `resolved` row reopens it; matching an
  `open` row updates it in place. The DB backstop (partial unique index on
  open fingerprints) makes violations an insert error, not a silent dupe.
- ⚠ **REQUIRED — per-check atomic supersede.** A check that completes
  replaces its own previous open findings in one transaction; a check that
  fails leaves its previous findings untouched. Never wipe the whole run's
  findings up front.
- ⚠ **REQUIRED — no verbatim excerpts in notes.** Findings are
  public-read rows. Cite cell keys and titles; never paste evidence text,
  proposition figures, or interviewee words.
- ⚠ **REQUIRED — confirm the import target** before any DB write;
  `references/adapter-contract.md` applies unchanged — wrong-project
  protection. (Vacuous on the no-DB route — no DB write ever happens
  there, so there is no target to hunt for.)
- ⚠ **REQUIRED — an audit is reads + findings.** If the user asks the audit
  to also fix what it finds, that is a separate, explicitly-confirmed pass
  with the `sb:map` skill afterwards.

## The pipeline

```
imported blueprint (or IR files)
  → roster    (enumerate references/check-*.md; skips decided HERE and
               only here — rules in playbook §1.5, every skip reported)
  → export    (one read-only blueprint export the auditors share —
               scripts/audit_tools.py export)
  → dispatch  (one auditor per check, parallel, blind)
  → collect   (findings JSON per check; malformed output = check failed,
               re-dispatch once, then report the check as failed)
  → dedupe    (fingerprint vs existing rows: drop dismissed, reopen
               resolved, update open)
  → write     (one run_id for the run; per-check atomic supersede)
  → report    (per-check counts + skipped checks + failed checks; nothing
               silent)
```

## The check roster

One file per check, `references/check-<name>.md`. Wave 1 needs only core
blueprint data; wave 2 reads the spec columns and **skips gracefully** —
reported, never silent — when they are absent or empty.

| Wave | Check | Asks |
| --- | --- | --- |
| 1 | `gap-sweep` | Which experienced moments have no cell — empty stretches, dangling triggers, uncovered steps |
| 1 | `jargon-lint` | Which customer-facing cell texts use words the customer would never say |
| 1 | `channel-conflict` | Where do simultaneous cells compete for the same actor or channel |
| 2 | `kpi-alignment` | Do lane KPIs reward what the cells actually do (lane `kpis`/`tools`) |
| 2 | `perceived-owner` | Where the recorded owner and the perceived owner diverge (owner pair) |
| 2 | `value-ledger` | Which cells deliver value to nobody, and which audiences receive none (`value_props`) |
| 2 | `fee-visibility` | Where money changes hands invisibly to the customer journey |

Wave-2 checks read spec columns (`kpis`/`tools` on lanes, the owner
pair and `value_props` on cells). Both the IR schema and the template
database carry them as optional fields; an export whose cells simply
never filled them will see wave 2 return `status: skipped` — a correct,
reportable result, not a failure.

## Deterministic exit conditions

| Phase | Exit condition |
| --- | --- |
| Roster | Every `check-*.md` either dispatched or reported skipped-with-reason |
| Collect | Every dispatched check returned valid findings JSON or is reported failed after one retry |
| Write | Rows for this `run_id` = deduped findings; open-fingerprint index reports zero conflicts; per-check supersede left no orphaned open findings from prior runs of completed checks |
| Idempotence | Running twice on an unchanged blueprint yields zero new rows the second time |
| Triage | The named finding's `status` changed and nothing else did |
| Report | Printed checklist: per-check found/skipped/failed counts and the run_id — never silent |

## Agents

- `auditor` — one check doc + the blueprint export in; findings JSON out
  (check, severity `info|warn|critical`, cell keys, note). Blind to other
  checks. Tools: Read, Glob, Grep, Bash.
- `impact-tracer` — used by `channel-conflict` when a suspected conflict
  needs its downstream chain walked (shared with the whatif skill).

## References

| Read when | File |
| --- | --- |
| Doing anything in this skill | `references/audit-playbook.md` |
| Executing a specific check | `references/check-<name>.md` |
| Anything touching an import target | `references/adapter-contract.md` |
| Understanding the findings table | `references/data-model.md` |
| Naming lanes/actors while reading | `references/lane-vocabulary.md` |
