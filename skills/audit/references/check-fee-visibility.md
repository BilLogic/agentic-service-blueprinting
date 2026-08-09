# check: fee-visibility
wave: 2   # needs value_props/description columns carrying money mentions; skip if none found
severity-default: warn

## Question
Where does money change hands — fees, charges, credits — invisibly to the
customer's journey?

## Read
Cells whose content/description/value_props mention prices, fees,
billing, invoices, credits. For each, the same-step and adjacent
customer-lane cells: is the money moment visible frontstage?

## Finding shape
One finding per money moment. Backstage charge with no frontstage
disclosure cell at or before it → critical; disclosure that happens only
AFTER the charge → warn; visible-but-jargoned disclosure → info and defer
wording to jargon-lint (don't double-report).

## Non-findings
Internal cost accounting (org pays, customer never does); money mentions
in evidence/provenance rather than the journey itself.
