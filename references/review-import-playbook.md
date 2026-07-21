# Review & Import Playbook — validated IR → verified target

Two gated phases: human review ending in a hash-bound sign-off, then import
through a backend adapter ending in read-back verification. Nothing reaches
a target without passing both gates, in order.

## Phase A — Review & sign-off

### 1. Grid preview, per scenario

Render each drafted scenario as a **markdown grid** (lanes as rows, steps as
columns, cell labels in the grid) in chat — non-technical users can't edit
the raw IR JSON safely, so the preview IS their editing surface.

- **Paginate above ~8 layers or ~12 steps** — a 10×20 grid in one message is
  unreadable. Split by lane groups or step ranges and label each page.
- Show path-by-path; call out triggers as a short list under the grid.
- Surface every `needs_review: true` cell explicitly with its provenance —
  these must be confirmed or corrected, not scrolled past.
- Per locale, preview each locale's text (or side-by-side columns for short
  grids).

### 2. Conversational corrections

Apply user edits to the IR; after **any** hand or model edit, the
auto-validate hook re-runs `scripts/validate_ir.py` — never proceed on a
failing validator.

### 3. Adversarial review

Dispatch the `blueprint-reviewer` agent (fresh context — it never saw the
parsing, so it isn't anchored on it). It returns numbered findings:
referential gaps, journey-logic holes, provenance coverage. Resolve each
finding — fix, or record a reasoned won't-fix with the user's agreement.

### 4. ⚠ REQUIRED — hash-bound sign-off (per scenario)

Sign-off binds **per scenario**, not per file — so approving scenario ⑥ and
later appending scenario ⑦ leaves ⑥ signed (friction #19). When the user
explicitly approves a previewed scenario:

1. Compute its hash: `python3 scripts/compute_signoff_hash.py <ir> --scenario <key>`.
2. Record that `content_hash` (+ `signed_at`/`signed_by`) on the scenario's
   entry in `blueprint-workspace.json` (see `references/workspace-state.md`),
   and set its status to `signed_off`.

Import **refuses on hash mismatch, per scenario** — an edit after approval
de-signs only the scenario it touched and re-enters this phase for that
scenario. Never record a hash without an explicit user approval.

**Phase A exit (deterministic): all `blueprint-reviewer` findings resolved
AND each covered scenario's `content_hash` is recorded and matches its current
subtree hash.**

## Phase B — Import

### 5. ⚠ REQUIRED — adapter selection: ASK

Present the no-DB fallback and live-DB modes as **co-equal options** and ask
which the user wants (per locale). Never default-assume Supabase. State the
trade-off honestly: fallback = zero infra, static hosting anywhere;
live-DB = requires Supabase or a PostgREST-compatible read API. See
`references/adapter-contract.md`.

### 6. Pre-flight

- `scripts/validate_ir.py` exits 0 (⚠ REQUIRED before any import).
- Each imported scenario's `content_hash` matches its current subtree hash
  from `scripts/compute_signoff_hash.py` (⚠ REQUIRED, per scenario).
- IR `schema_version` compatible with the workspace clone's.
- Target echo + user confirmation (project ref / output paths) — wrong-project
  protection (⚠ REQUIRED).
- Pre-import read-back diff: if the target differs from `last_import` state
  (e.g. manual Studio edits), warn and offer an export before replacing.

### 7. Import, per locale

One artifact set and one target per locale:

- **Fallback**: `scripts/generate_fallbacks.py` → generated data module
  (header warning intact) → `tsc --noEmit` must pass (CJK escaping is the
  known failure mode).
- **Supabase**: `scripts/generate_seed_sql.py` → one transactional
  scenario-replace seed per locale → run via local `supabase db reset`,
  user-run CLI against hosted, or Supabase MCP `apply_migration` — in that
  order of preference. Secrets rules apply (adapter contract §7).

### 8. Read-back verification

Read the target back: per-scenario row counts (paths, steps, path_steps,
layers, cells, triggers) match the IR + content spot-checks. Record
`last_import` (hash + timestamp) per locale in the workspace state and mark
scenarios `imported`. Optionally dispatch `render-checker` against the
running app now, or defer to the present/deploy step.

**Phase B exit (deterministic): transaction committed AND read-back
verification counts match the IR on every imported locale's target.** A
committed transaction with unverified read-back is NOT done.
