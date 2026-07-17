# Layer Roles

The semantic contract between blueprint content and rendering. Source of
truth: `src/lib/layerRoles.ts` (vocabulary + legacy shim) and
`src/lib/blueprintLayout.ts` (rendering + divider-line rules).

## The split: display name vs role

A layer has two identities:

- `display_name` (`layers.name`) — free-form label in **any language**
  ("现场技术员", "Regular Tutor", "Compliance Review").
- `role` (`layers.layer_role`) — a stable semantic key that drives rendering.
  `null`/absent = plain generic swimlane.

Never infer semantics from the display name. That was the old magic-name
contract; it broke every non-English blueprint.

## Canonical vocabulary

| Role | Rendering | Typical lane |
| --- | --- | --- |
| `customer_actions` | Text cells; **interaction line draws after this lane** | The spine actor's actions |
| `frontstage_actions` | Text cells; **visibility line draws after** | Staff actions the spine actor sees |
| `frontstage_tech` | Pill cells (newline-separated items); visibility line draws after it *unless* a `frontstage_actions` lane immediately follows (then the line follows the actions lane) | Customer-facing systems |
| `backstage_actions` | Text cells; **internal interaction line draws after** it when a `support_systems` lane immediately follows | Staff actions out of sight |
| `backstage_tech` | Pill cells | Internal systems |
| `support_systems` | Pill cells | Supporting teams/vendors/infrastructure |
| `visual` | Picture row (image cells, no text) | Journey snapshots |
| `step_visual` | Picture row variant | Per-step imagery |

## Line-anchoring semantics

The three classic blueprint divider lines are **anchored by roles**, not row
positions:

- **Interaction line**: after the `customer_actions` lane.
- **Visibility line**: after `frontstage_actions` (or `frontstage_tech` when
  no actions lane follows it) — i.e. above the backstage lanes.
- **Internal interaction line**: after `backstage_actions` only when a
  `support_systems` lane comes next (marks the hand-off to support).

No role present → no line. That is valid: an internal-ops blueprint with no
customer lane renders as plain swimlanes with no interaction line.
**No role is a mandatory spine** — assign `customer_actions` to whichever
actor's journey is the spine (ask "whose journey is the spine?" during
elicitation), or to none.

## Pill and visual lanes

- Roles `frontstage_tech`, `backstage_tech`, `support_systems` render cell
  `content` as **pills**: one pill per newline-separated line
  (`"GIS Portal\nWork Order App"` → two pills). `tech_description` links
  attach long-form copy/screenshots to a pill by matching its label.
- Roles `visual`/`step_visual` render `picture` and ignore text content.

## Custom roles

The vocabulary is extensible. Org-defined roles (e.g. `physical_evidence`,
`compliance_review`, `partner_ops`) are legal `layer_role` values and render
as generic swimlanes — same as `null`, but the role key preserves the
org's semantic intent in data, keeps crosswalks reusable, and lets future
template versions attach rendering to it. Prefer a named custom role over
`null` whenever the lane means something.

All layout logic is role-agnostic where it can be: e.g. backward in-lane
loop corridors are computed from trigger geometry for ANY lane, custom
roles included (`blueprintLayerHasBackwardInLaneLoop`).

## Legacy name shim

Content that predates `layer_role` (rows with null role) is resolved through
`LEGACY_NAME_TO_ROLE` in `src/lib/layerRoles.ts`: exact display names like
`'Front Stage Tech'`, `'Customer Actions'`, `'Regular Tutor'` (a PLUS spine
actor), `'Visual'` map to roles at render time. The shim is for legacy data
only — **new IR must always set `role` explicitly** and never rely on
name matching. The validator warns on near-miss names that look like they
wanted a role (`'Frontstage Tech'`, `'前台技术'` → "did you mean
frontstage_tech?").

## Guidance for assigning roles

- One `customer_actions` per path at most (the layout draws one interaction
  line); multiple actor lanes are fine — the non-spine actors get `null` or
  custom roles.
- Keep tech lanes as pill roles; prose in a pill lane reads badly.
- Row order is yours (`row` in the IR), but the conventional top-to-bottom
  reading is: visual → spine actor → other actors → frontstage tech/actions
  → backstage tech/actions → support systems.
