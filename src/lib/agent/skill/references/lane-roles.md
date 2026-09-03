# Lane Roles

The semantic contract between blueprint content and rendering. Source of
truth: `src/lib/laneRoles.ts` (vocabulary + legacy shim) and
`src/lib/blueprintLayout.ts` (rendering + divider-line rules).

## The split: display name vs role

A lane has two identities:

- `display_name` (`lanes.name`) — free-form label in **any language**
  ("现场技术员", "Field Technician", "Compliance Review").
- `role` (`lanes.lane_role`) — a stable semantic key that drives rendering.
  `null`/absent = plain generic swimlane.

Never infer semantics from the display name. That was the old magic-name
contract; it broke every non-English blueprint.

## Canonical vocabulary

The set is **closed**: `lanes_lane_role_check` accepts exactly these eight
roles or `null`. A lane whose role is not one of them is rejected on write —
an unconstrained column is how a lane goes unclassified, and the divider lines
are drawn from the role.

| Role | Rendering | Typical lane |
| --- | --- | --- |
| `customer_actions` | Text cells; **interaction line draws after this lane** | The spine actor's actions |
| `frontstage_actions` | Text cells; **visibility line draws after** | Staff actions the spine actor sees |
| `frontstage_touchpoints` | Touchpoint cells (one per newline-separated item); visibility line draws after it *unless* a `frontstage_actions` lane immediately follows (then the line follows the actions lane) | Touchpoints the customer meets directly |
| `backstage_actions` | Text cells; **internal interaction line draws after** it when a `support_actions` lane immediately follows | Staff actions out of sight |
| `backstage_touchpoints` | Touchpoint cells | Touchpoints only staff meet |
| `support_actions` | Text cells; the internal interaction line anchors on it | Supporting teams, vendors, infrastructure |
| `partner_actions` | Text cells | A party outside the service, acting where the customer can see them |
| `storyboard` | Storyboard frame row (image cells, no text) | Journey frames |

## Line-anchoring semantics

The three classic blueprint divider lines are **anchored by roles**, not row
positions:

- **Interaction line**: after the `customer_actions` lane.
- **Visibility line**: after `frontstage_actions` (or `frontstage_touchpoints`
  when no actions lane follows it) — i.e. above the backstage lanes.
- **Internal interaction line**: after `backstage_actions` only when a
  `support_actions` lane comes next (marks the hand-off to support).

No role present → no line. That is valid: an internal-ops blueprint with no
customer lane renders as plain swimlanes with no interaction line.
**No role is a mandatory spine** — assign `customer_actions` to whichever
actor's journey is the spine (ask "whose journey is the spine?" during
elicitation), or to none.

## Touchpoint and storyboard lanes

- Roles `frontstage_touchpoints` and `backstage_touchpoints` render cell
  `content` as **touchpoints**: one touchpoint per newline-separated line
  (`"GIS Portal\nWork Order App"` → two touchpoints). A `cell_touchpoints` row
  attaches long-form copy, resources and a featured link to one touchpoint:
  its `name` is the touchpoint's label, and the row survives a rename where
  the old label-matched entry silently stopped being found. A "tech" lane was
  never only tech — it held the things a moment happens *through*, which is a
  touchpoint: an app, a document, a channel, a place.
- Role `storyboard` renders `frame` and ignores text content. An empty
  storyboard row (null `frame`) is a valid default — see
  `skills/map/references/ingest-playbook.md` §6 for sourcing stage images.

## No custom roles

The vocabulary is closed. A lane that means something the eight roles do not
name uses `null` (a generic swimlane) — a "Stakeholders" band, an actor lane
named for a person. `null` is legal on purpose and is exactly how such a lane
already rendered: no role style, no divider anchored on it. The old advice to
mint an org-defined role (`physical_evidence`, `compliance_review`,
`partner_ops`) no longer holds at the database, because an unconstrained
column is how thirty-six support lanes once went unclassified.

All layout logic is role-agnostic where it can be: e.g. backward in-lane
loop corridors are computed from dependency geometry for ANY lane, `null`
role included (`blueprintLaneHasBackwardInLaneLoop`).

## Legacy name shim

Content that predates `lane_role` (rows with null role) is resolved through
`LEGACY_NAME_TO_ROLE` in `src/lib/laneRoles.ts`: exact display names like
`'Front Stage Tech'`, `'Customer Actions'`, `'Visual'` map to roles at render
time; a deployment adds its own spine actors to that map. The shim is for
legacy data only — **new IR must always set `role` explicitly** and never rely
on name matching. The validator warns on near-miss names that look like they
wanted a role (`'Frontstage Tech'`, `'前台技术'` → "did you mean
frontstage_touchpoints?").

## Guidance for assigning roles

- One `customer_actions` per path at most (the layout draws one interaction
  line); multiple actor lanes are fine — the non-spine actors get `null`.
- Keep touchpoint lanes as touchpoint roles; prose in a touchpoint lane reads
  badly.
- Row order is yours (`row` in the IR), but the conventional top-to-bottom
  reading is: storyboard → spine actor → other actors → frontstage
  touchpoints/actions → backstage touchpoints/actions → support actions.
