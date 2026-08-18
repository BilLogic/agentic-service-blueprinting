---
title: "Skills, agents, and references expansion — slice/audit/whatif, deferred map rename"
type: feat
status: completed
date: 2026-07-29
---

# Skills, agents, and references expansion

## Enhancement Summary (deepened 2026-07-29)

Material changes vs. first draft:
1. **Re-sequenced (simplicity finding + plan 001 decision 8):** the `blueprint`→`map`
   rename and the references/ reorg move to the END — the slice skill lands first,
   alongside the existing skill, in the existing flat `references/` layout. De-risks
   the live Ecoeled workspace and removes zero-capability churn from the critical path.
2. **Whatif→map handoff hardened (architecture finding):** `change-request-schema.json`
   added as a first-class contract; change requests embed the base scenario sign-off
   hash(es) — `map-promote` refuses or re-traces on mismatch (staleness guard);
   transport = workspace file in local dev, downloaded JSON from deployed builds.
3. **Security package:** secret_guard patterns (Gemini `AIza…`, OpenAI `sk-…`, Supabase
   `sb_secret_…`, + Bash-write bypass noted), storyboard prompt redaction + first-
   generation human review, evidence minimization/pseudonymization rules, deploy-notes
   REQUIRED auth section.
4. **Parity fixes (agent-native review):** finding-triage route in audit; map may flip
   `findings.status` for supersession (write-invariants); storyboard/regeneration
   affordance hints; reconcile step so agents see human panel edits (plan 002
   decision 6).
5. Timeline: this plan is **stage 2–3** of the rollout (after uno validates the design).

Plugin facts: discovery by directory convention; replicate the existing skill's
architecture — entry-state routing table, playbook gating, ⚠ REQUIRED hard rules,
deterministic exit conditions vs `blueprint-workspace.json`, `${CLAUDE_PLUGIN_ROOT}`
paths. Repo convention: drafting happens in the **main context**; subagents are for
heavy reading (document-reader / blueprint-reviewer / render-checker precedent).

## Phase 1 — slice skill (first, in the existing layout)

`skills/slice/SKILL.md` — routing table over: slice type (journey/step/lane/cell/custom);
new vs regenerate vs edit vs delete; storyboard on/off.

- Writes `slices`/`slice_items` — **never cells**. Locale param required (per-locale
  artifacts). **v1 slices are single-scenario** (frontend contract, plan 003).
- Selection rules: journey = experience closure for ANY actor (own-lane + interacted
  cells across the interaction line, one path choice per phase); step = one column;
  lane = one lane across phases; cell = single cell + journey placement (no orphan
  briefs); custom = user-listed. Parallel drafting anchors on
  `references/lane-vocabulary.md` (dogfood friction #20).
- Every run emits the DB slice AND a markdown doc (templates below): cell-key
  citations, locator strip, numbered anchors. **Derived artifacts written to
  public-read tables or docs never quote evidence excerpts or proposition figures
  verbatim — reference by title/key** (security 2.3; blueprint-reviewer slice mode
  checks it).
- Regeneration: `origin=generated` only; `customized` needs explicit confirm.
- Membership queries use `@>` / `&&` (GIN contract, plan 002).
- Exit conditions: rows validate against `slice-schema.json` (new, flat references/ for
  now); every cell_id resolves; blueprint-reviewer slice mode passes; render-checker
  confirms `?slice=<id>` renders.

New reference files (flat layout until Phase 5): `slice-schema.json`,
`slice-playbook.md` (all five types + edit/regenerate/delete),
`slice-templates.md` (journey-summary / step-summary / lane-spec / cell-brief document
structures — textbook-derived, **abbreviated headings ours: function/form pair, no
vendor names**), `storyboard-prompts.md`.

**Storyboard sub-flow** (can ship after the text path — simplicity note): text-first,
frames complete without images. Then: character-ref once
(`slices/<id>/character-ref.png`), per-frame scenes feeding the ref; style block (flat
vector, consistent character, 16:9, no text in image); **prompt redaction step — strip
person/org/contact strings; persona archetype, never the interviewee** (security 3.3);
human review gate before first upload per slice. Gemini key from gitignored `.env`
only. Per-frame resume on rate limit; deterministic paths overwrite (no churn);
`illustration.updated_at` stamped for the frontend's `?v=` cache-bust. Upload via
service key (bucket policies may be dashboard-managed on hosted — plan 002).

## Phase 2 — audit skill + auditor agent

`skills/audit/SKILL.md`:
- Enumerates check files → one fresh-context **auditor** per check, parallel.
- Run semantics: one `run_id`; per-check atomic supersede (a completed check replaces
  its own previous open findings; partial failure leaves other checks untouched);
  fingerprint dedupe with the DB backstop (partial unique index, plan 002) —
  re-detected dismissed stays dismissed, resolved reopens.
- **Triage route (parity fix):** "dismiss/resolve finding X" is a first-class routing
  entry — agents never improvise raw SQL for status changes.
- **Check roster ships in two waves** (simplicity finding): wave 1 needs no new data —
  `gap-sweep`, `jargon-lint`, `channel-conflict`; wave 2 lands with its columns —
  `kpi-alignment` (lane kpis/tools), `perceived-owner` (owner pair), `value-ledger`
  (value_props), `fee-visibility`. One file per check stays the design.

`agents/auditor.md` (tools: Read, Glob, Grep, Bash): one check doc + blueprint export
in; findings JSON out (check, severity info|warn|critical, cell keys, note). Blind to
other checks.

## Phase 3 — whatif skill + impact-tracer agent

`skills/whatif/SKILL.md`:
- Operations: replay, restage (visibility-line move — comprehension gain vs etiquette
  risk + reassurance-touchpoint suggestion), prioritize (3–5 focus cells: evidence +
  proposition expression + backstage `needs` chain depth; quick-win warnings).
- Variant = IR file in the workspace, never DB; compare view via plan 003 Phase 5
  (local-dev loop; the deploy-safe artifact is the comparison markdown).
- Writes findings (source=whatif) only. Accept → **change request** conforming to
  `change-request-schema.json` (new): the diff, affected scenario keys, and the **base
  sign-off hashes** at analysis time.
- blueprint-reviewer verifies replay claims before results surface.

`agents/impact-tracer.md` (tools: Read, Glob, Grep, Bash): change/cell + blueprint
export in; walks `trigger` + `needs` downstream with **visited set + depth cap** (cycles
via loops_to_phase are legal); returns affected cells, broken assumptions,
displaced-demand destinations. Primary consumer v1 = whatif; audit's channel-conflict
and map's update mode adopt it as they land (reuse noted, not front-loaded).

**`map-promote` playbook** (added to the existing skill now; renamed with it later):
consume change request → **verify base hashes still match** (refuse/re-trace on drift)
→ edit IR → print de-sign notice (content changes only — spec columns and evidence
don't de-sign, plan 002) → re-sign → re-import → `sweep_orphans.py` → auto-resolve
superseded whatif findings (the one sanctioned map write to `findings.status`).
Whole-whatif promote only, v1. Final step: printed checklist, never silent.

## Phase 4 — existing-skill extensions + hooks + docs

- **map extensions** (on `skills/blueprint/` as-is): intake battery
  (`proposition-questions.md`: funding/pricing/partners + three validation questions,
  gate for brand-new services only; app-centrism unwind); cell spec authoring
  (function/form/value_props/owner/perceived_owner; lane + phase fields asked when
  relevant); evidence rows from document-reader provenance (**minimization rules:
  shortest excerpt, participant codes P1/P2 — never names/emails/employers, regex pass
  in exit conditions; consent/IRB check is the operator's, say so**); legacy
  `cell.evidence` conversion; **reconcile step** — before re-export, diff DB spec
  columns vs IR so human panel edits reach the agent's canon (plan 002 decision 6).
- `blueprint-reviewer`: slice mode (claims trace to cell keys, no invention, persona
  consistency, **no verbatim excerpts**) + whatif-claim mode.
- `render-checker`: slice/present/lens URLs via `urlViewState` params.
- Hooks: `validate_ir_on_edit.py` covers v2 fields. `secret_guard.py` adds patterns —
  Gemini `\bAIza[0-9A-Za-z_\-]{35}\b`, OpenAI `\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_\-]{20,}\b`,
  **Supabase new-format `\bsb_secret_[A-Za-z0-9_\-]{20,}\b` (a gap in the guard today —
  non-JWT keys sail past `JWT_RE`)**; docstring notes the Bash-heredoc bypass; tests
  incl. the `.env.example` committable case.
- deploy-notes REQUIRED additions: **disable public sign-ups + `shouldCreateUser:
  false`**; Site URL + redirect allow-list (silent fallback behavior, Netlify
  deploy-preview pattern, SPA redirect + fragment survival); CSP `_headers`; storage
  policy dashboard fallback; sidecar privacy (gitignored default; private-deploy-only
  `--include-restricted`); evidence retention default (purge/paraphrase after
  engagement; lifecycle-delete cascades).
- `.claude-plugin/plugin.json`: version bump; fix the stale "validated **YAML** IR"
  wording → JSON (contradicts the locked JSON-only decision).

## Phase 5 — reorg + rename (last, own release)

- references/ regrouped: `schemas/ conventions/ playbooks/ templates/ checks/` —
  including `write-invariants.md` (the actor/table matrix, the map-status-supersede
  exception, the no-verbatim-excerpt rule, the paths-from-DB-ids-only rule, link
  editing recorded as agent-only, the slides-vs-slices naming note).
- `skills/blueprint` → `skills/map` with a two-line deprecation stub for one release;
  every `${CLAUDE_PLUGIN_ROOT}` path updated; grep for old paths returns nothing;
  coordinate with a plugin version bump and test resume-from-existing-workspace routing
  (Ecoeled mid-flight risk).

## Acceptance criteria

- [ ] slice: all five types produce DB slice + doc + passing reviewer gate on the
      sample IR; storyboard resumes after simulated rate limit; no excerpt text in any
      slice doc or public-read row (grep test).
- [ ] audit ×2 unchanged blueprint → zero duplicates (skill logic AND DB backstop);
      dismissed stays dismissed; triage route works; wave-1 checks run without wave-2
      columns present.
- [ ] whatif never writes cells or DB variants; promote refuses on stale base hash;
      full checklist prints; impact-tracer terminates on cyclic graphs.
- [ ] secret_guard catches all three new key formats; deploy-notes carry the REQUIRED
      auth section.
- [ ] Phase 5 rename: `/blueprint` stub forwards; old-path grep clean; Ecoeled
      workspace resumes correctly post-rename.
- [ ] Stage-3 gate: full slice → audit → whatif → promote loop on the live Ecoeled
      workspace with the friction log updated.

## Dependencies & risks

- Stage 2+ work: depends on plan 002 Phase 2 (pipeline) and plan 003 Phase 1 (URLs).
- Riskiest remaining item is Phase 5 (rename against the live Ecoeled workspace) —
  now isolated at the end with its own release and resume test.
- Storyboard pipeline is deliberately detachable — slice ships text-first.

## Sources

- Origin: plan 001 decision log (esp. 6–8) + design conversation 2026-07-29.
- Deepening reviews: agent-native (triage route, reconcile, transport, affordances),
  architecture (change-request schema + staleness guard, local-dev compare constraint),
  security (secret_guard regexes, redaction/retention, deploy-notes package),
  simplicity (re-sequencing, check waves, single-scenario v1), data-integrity
  (fingerprint DB backstop), learnings report (main-context drafting, lane-vocabulary
  anchor, manifest YAML-wording fix).
- Textbook ch. 6: slice templates (abstracted), check interrogations, proposition
  battery, restaging.
