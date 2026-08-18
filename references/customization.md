# Customization

Every supported customization point of the template, plus the portfolio
conventions for running many client workspaces, and the template upgrade
recipe. Everything here is guidance — the only hard rule is the
schema-version compat check in the upgrade recipe.

## Contents

- Layer roles
- Theming & branding
- View types & path types
- Scale
- Portfolio conventions (consultants / agencies)
- Template upgrade recipe (⚠ compat check required)

## Layer roles

The canonical vocabulary + org-defined custom roles are documented in
`references/layer-roles.md`. Customization summary: display names are
free-form in any language; custom roles are just strings (they render as
generic swimlanes); no role is mandatory. Prefer creating a custom role over
`null` when the lane has org-specific meaning — it keeps semantics in data.

## Theming & branding

- `src/config.ts` — `ORG_NAME`: the workspace/product name in app chrome
  (sidebar wordmark, breadcrumbs). Change per instantiation.
- `index.html` — browser tab title.
- `src/styles/tokens.css` — the design tokens (CSS custom properties for
  colors, radii, fonts, light/dark). The **BRAND SEAM** block at the top of
  the file is the one block an adopter edits to rebrand the canvas: the
  template ships hue-neutral (greyscale semantic tokens), and the only
  chromatic family is the muted blue-grey used for the interactive phase
  frames — swap those five values for your brand's tint family (keeping the
  light → dark ordering) and the canvas follows. Restyle by editing tokens,
  not components; the shadcn components read the tokens.
- Tech pills use a neutral palette by default; link-driven tech metadata
  (`tech_description` links) carries per-tool copy and imagery.

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

## View types & path types

Set per scenario / per path **in the IR**, not in code: `view_type`
(`single` | `side-by-side` | `integrated`) and `path_type` (`happy` |
`unhappy` | `exception` | `alternative`). Note `integrated` is a legacy
value — persisted rows coerce to the plain Stacked view on read
(`src/lib/viewTypeVocabulary.ts`). Side-by-side compares any two
labeled variants via `variant_label` — designed-vs-reality, before/after a
redesign, or two stakeholders' conflicting accounts. There are no hardcoded
scenario or path IDs left in the template; do not reintroduce any.

## Scale

Schema and frontend support unbounded layers/steps/paths — more actors just
means more lanes. The validator emits **soft warnings** above ergonomic
thresholds, never errors; the shipped sample content (8 paths across 6
scenarios, one 7-lane roster, widest board 8 lanes × 10 steps, one custom
role, bilingual CJK) is the proof fixture.

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
   layer-role vocabulary changes.
3. Pull the new template into the workspace clone (git merge from the
   template remote, or re-clone + copy `blueprint/`, `.env`, `HANDOFF.md`,
   `blueprint-workspace.json` forward). Resolve conflicts in favor of the
   template for app code — workspace-local app edits are unsupported.
4. Update `schema_version` in both the workspace state and the IR.
5. Re-run `scripts/validate_ir.py` (vocabulary/schema drift surfaces here).
6. Re-import per `skills/map/references/review-import-playbook.md` (re-provision if the
   DDL changed), rebuild, redeploy, verify with `render-checker`.

**Never import an IR whose `schema_version` mismatches the workspace clone**
— that's the compat check the import pre-flight enforces.

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
