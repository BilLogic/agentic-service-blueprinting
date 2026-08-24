# check: jargon-lint
wave: 1
severity-default: info

## Question
Which customer-facing texts use words the customer would never say?

## Read
Cells in lanes whose role is customer_actions or frontstage_* only. The
lane vocabulary (references/lane-vocabulary.md) tells you which actor
reads each lane. Lane roles resolve PER PATH (`paths[].lanes[]`) — the
same lane key can carry different roles in different scenarios/paths, so
never resolve a role from the key alone.

## Finding shape
One finding per term (grouped across cells), cell_keys = every cell using
it. The note names the term and a plainer candidate, citing keys — never
rewriting cell text in the note. Internal-system names, org-chart words,
and acronyms in customer-visible cells → warn; the same words in backstage
lanes → not a finding.

## Non-findings
Domain terms the customer genuinely uses (verify against evidence titles
if present); product names the service deliberately teaches; backstage
shorthand. Crew-behavior narration in `frontstage_actions` cells that the
customer experiences but never READS (the cell describes what staff do,
not copy shown to the customer) — the lint applies to customer-read text.
`journey_stage` labels ARE customer-facing (they render as headers).
When unsure whether the customer sees the cell, check the lane's role —
do not guess from wording.
