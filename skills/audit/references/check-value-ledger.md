# check: value-ledger
wave: 2   # needs cell `value_props`; skip if empty everywhere
severity-default: info

## Question
Which cells deliver value to nobody, and which audiences appear in the
service but never receive value?

## Read
All value_props across the scenario: build audience → cells and
cells-without-props lists. Lane vocabulary for who the audiences are.

## Finding shape
- A frontstage/customer cell with zero value_props while its siblings have
  them → info; per-lane grouped finding.
- An actor present as a lane but never named as a value audience anywhere
  → warn; scope-key fingerprint; note asks "who is this lane for?".
- Value claimed for an audience the scenario never touches → info.

## Non-findings
Purely mechanical backstage cells (a cron job owes nobody a value prop);
scenarios where value_props are wholesale unset (skip — that's wave-2
absence, not a ledger hole).
