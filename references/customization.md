# Customization

Every supported customization point of the template, plus the portfolio
conventions for running many client workspaces, and the template upgrade
recipe. Everything here is guidance except two hard rules, both in the
upgrade recipe: the schema-version compat check, and every bump shipping its
migration in the same change.

## Contents

- Lane roles
- Theming & branding
- View types & path types
- Scale
- Portfolio conventions (consultants / agencies)
- Template upgrade recipe (⚠ compat check required)

## Lane roles

The canonical vocabulary + org-defined custom roles are documented in
`references/lane-roles.md`. Customization summary: display names are
free-form in any language; custom roles are just strings (they render as
generic swimlanes); no role is mandatory. Prefer creating a custom role over
`null` when the lane has org-specific meaning — it keeps semantics in data.

## Theming & branding

- `src/config.ts` — `ORG_NAME`: the workspace/product name in app chrome
  (sidebar wordmark, breadcrumbs). Change per instantiation.
- `index.html` — browser tab title.
- `src/styles/` — the design tokens (CSS custom properties for colors,
  radii, fonts, light/dark), split across a file per concern. The blocks an
  adopter edits are marked **BRAND SEAM**, and there are two of them:
  `src/styles/themes/light.css` and `src/styles/themes/dark.css`. The
  template ships hue-neutral — every chroma dial is 0, so the whole semantic
  lane renders greyscale. To rebrand: set `--hue` to your brand's OKLCH hue,
  raise `--chroma` (surfaces) and `--primary-chroma` (the filled control),
  and replace the greyscale `--brand-*` ramp with your tint family, keeping
  its light → dark ordering. Everything else derives — the border, the
  foreground flip and the focus ring follow from `src/styles/semantic.css`
  on their own. Restyle by editing tokens, not components; the shadcn
  components read the tokens.
- Tech pills use a neutral palette by default; a `cell_touchpoints` row
  carries the copy, screenshots and design link for one pill at one moment.

### Pinning an org tech-pill palette

By default `src/lib/techPillColors.ts` ships an **empty** `TECH_PILL_COLORS`
and colors each pill deterministically by hashing its label into a neutral
palette. That keeps a fresh clone brand-neutral, but hash-assigned pastels
carry no meaning — two tools in the same system land on unrelated colors.

To give a client's tools coherent color families, pin them: add
`label → hex` entries to `TECH_PILL_COLORS` (exact pill label as the key),
grouping related tools onto one family. Example:

```ts
export const TECH_PILL_COLORS: Record<string, string> = {
  // Customer-facing app → green family
  'Mobile App': '#DCF3E4',
  'SMS Notify': '#DCF3E4',
  // Internal platform → slate family
  'Work-order Intake': '#DCE6F5',
  'SLA Timer': '#DCE6F5',
  // External partner → amber family
  'Field Contractor': '#F8E6D0',
}
```

Any label not in the map still falls back to the deterministic hash palette,
so partial pinning is fine. Keep the map **client-specific** — do not commit
one client's labels into the shared template.

## Layouts & path kinds

Set per scenario / per path **in the IR**, not in code: `layout`
(`single` | `stacked`) and `kind` (`happy` | `variant` | `exception`).

Both lists got shorter at `21000116000000`. `side-by-side` and `integrated`
were one layout a reader switches between rather than two a scenario is stored
as — the client had been collapsing both to the same view on read for a while,
and `21000116000000` moved the rows to `stacked` so the seam could go.
`unhappy` and `alternative` were two spellings of one thing, and `exception`
already carries "this went wrong", so `21000116000000` folded both into
`variant`.

The stacked layout compares any two labeled variants via `variant_label` —
designed-vs-reality, before/after a redesign, or two stakeholders' conflicting
accounts. There are no hardcoded scenario or path IDs left in the template; do
not reintroduce any.

## Scale

Schema and frontend support unbounded lanes/steps/paths — more actors just
means more lanes. The validator emits **soft warnings** above ergonomic
thresholds, never errors; the shipped sample content (8 paths across 6
scenarios, one 7-lane roster, widest board 8 lanes × 10 steps, one custom
role) is the proof fixture.

## Portfolio conventions (consultants / agencies)

- **One git workspace per client**: each client gets their own template
  clone with their own `blueprint/` dir and `blueprint-workspace.json`.
  Never mix clients in one workspace or one backend target.
- Per-client env & deploy registry: each workspace's state file records its
  own per-locale targets; keep client `.env` files out of git (verified
  gitignored).
- **`HANDOFF.md` per workspace** (generated from
  `assets/HANDOFF.md.template`): the offboarding story — where the IR lives,
  how to update, how to redeploy — written for whoever inherits the
  workspace after the engagement.
- Two authors collaborate via normal git branching; sign-off is per-branch.

## Template upgrade recipe (⚠ compat check required)

The template evolves under N client workspaces. The plugin and template
version together; `blueprint-workspace.json` records the workspace's
`schema_version`.

1. **Check compat first**: compare the workspace `schema_version` with the
   new template's. Same → skip to step 4.
2. Read the template CHANGELOG between the two versions for schema and
   lane-role vocabulary changes.
3. Pull the new template into the workspace clone (git merge from the
   template remote, or re-clone + copy `blueprint/`, `.env`, `HANDOFF.md`,
   `blueprint-workspace.json` forward). Resolve conflicts in favor of the
   template for app code — workspace-local app edits are unsupported.
4. Carry the IR across the bump — do **not** hand-edit `schema_version`:

   ```
   python3 scripts/migrate_ir.py blueprint/blueprint.json \
       --workspace blueprint-workspace.json --write
   ```

   Dry-run first (drop `--write`) to read the plan. The script rewrites the
   IR's field names for each version it steps through, sets the new
   `schema_version` on the IR and the workspace state, and re-anchors sign-off
   (below). Editing the version by hand leaves the file's fields at the old
   shape while claiming the new one — the exact mis-parse the version exists
   to prevent.
5. Re-run `scripts/validate_ir.py` (vocabulary/schema drift surfaces here).
6. Re-import per `skills/map/references/review-import-playbook.md` (re-provision if the
   DDL changed), rebuild, redeploy, verify with `render-checker`.

**Never import an IR whose `schema_version` mismatches the workspace clone**
— that's the compat check the import pre-flight enforces.

### The versioning rule (⚠ hard rule for template authors)

**Every `schema_version` bump ships its migration in the same change.** A new
value in the enum in `references/ir-schema.json` and a new step in
`scripts/migrate_ir.py` land together, or neither lands. A bump without a step
tells every workspace it is out of date and hands it nothing to run — and the
IR is not re-derivable: sign-off is a human decision recorded against
content that already exists.

A version leaves the enum only when its migration stops existing, which is
also when an IR at that version stops being upgradable and the workspace must
check out the template revision that wrote it.

### Sign-off across a bump

Sign-off binds to a SHA-256 of a scenario's subtree
(`scripts/compute_signoff_hash.py`). Renames land **inside** that subtree —
2026.07.16 → 2026.08.25 moved `description` → `summary` and `layers` →
`lanes` — so a hash recorded before a bump does not match the migrated file.
Signed scenarios would silently de-sign.

`--workspace` is what prevents that. For each scenario whose recorded
`content_hash` equals its pre-migration hash, the migration replaces it with
the post-migration hash and keeps `signed_at`/`signed_by`: sound because a
step moves no authored *value* — it renames a field name, or materializes a
default the absent field already meant. A step that ever edits authored
content declares itself non-content-preserving, and the script refuses to
touch sign-off at all — those scenarios go back through review.

The cheapest answer is a bump that never enters the subtree. 2026.08.25 →
2026.08.26 gives a dependency edge an optional `kind` whose absence means the
drawn kind — what every existing edge already meant — so the step writes
nothing, every scenario hashes to the same digest as before, and `--workspace`
reports each signed scenario as already anchored. Materializing the default
into every edge would have been content-preserving too, and would have
re-hashed every signed scenario for no gain.

A recorded hash matching neither side was already stale (the scenario was
hand-edited after it was signed). The migration reports it and leaves it: it
is a re-review, not a rename. `targets[*].last_import.content_hash` is left
alone too — step 6 re-imports anyway, and that record is a claim about what a
target actually holds.

### Stale workspaces & the audit-skill fallback

Workspaces scaffolded before the audit skill split may lack its files, and
the two layouts genuinely differ: the kit repo carries the split layout
(`skills/audit/SKILL.md`, check docs at `skills/audit/references/check-*.md`,
`skills/audit/scripts/audit_tools.py`), while installed-plugin layouts may be
pre-split — check docs at `references/check-*.md` with no `skills/audit/`
directory at all. A fallback that assumes one layout reports files as
missing when they merely live at the other path, so **try both paths**:
look under `skills/audit/references/` first, then `references/`, and treat
a file as absent only when neither has it.

To bring a stale workspace current, **re-vendor from the kit repo**
concretely: copy `skills/audit/` (the SKILL.md, the `references/check-*.md`
docs, and `scripts/audit_tools.py`) plus `references/audit-playbook.md`
from the kit repo into the workspace, then continue the upgrade recipe
above from step 4.
