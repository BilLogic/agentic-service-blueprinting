# check: value-ledger
wave: 2   # needs cell `value_props`; skip if empty everywhere
severity-default: info

## Question
Which cells deliver value to nobody, and which of the service's PEOPLE never
receive value?

## Read
All value_props across the scenario: build audience → cells and
cells-without-props lists. Then `list_stakeholders` — the registry is what
says who exists and what else each of them has been called.

Lane roles resolve PER PATH (`paths[].lanes[]`) — the same lane key can carry
different roles in different scenarios/paths, so never resolve a role from the
key alone.

## Resolve audiences through the registry, not by string match
An audience matches a stakeholder when it equals the stakeholder's `name` or
any of its `aliases`, case-insensitively. `tech` and `Field Technician` are one
person; `business` is the provider organisation, which is not a lane and
never can be.

## Only lanes with a stakeholder are actors
A lane whose `stakeholder_id` is null is STRUCTURAL — Front Stage Tech, Back
Stage Tech, Support Actions, Storyboard and the two action rows are the
blueprint's own scaffolding, 224 of 299 lane rows. Never ask who they are for.

> Before the registry existed this check matched lane names against audience
> strings, which meant it produced six false warnings in every one of 22
> scenarios ("Front Stage Tech is never a value audience — who is this lane
> for?"). That is why it was never trusted, and why the null check above is
> the first thing to apply.

## Finding shape
- A frontstage/customer cell with zero value_props while its siblings have
  them → info; per-lane grouped finding.
- A STAKEHOLDER who appears as a lane but is never named as a value audience
  anywhere → warn; scope-key fingerprint; note asks "who is this lane for?".
  `Supervisor` is the live example: one lane, a real actor, zero value
  entries — a true finding this check could not previously make.
- Value claimed for an audience that resolves to no stakeholder → info, and
  say which: it is either a missing alias or a missing member of the cast.
- Value claimed for a stakeholder the scenario never touches → info.

## Non-findings
Lanes with no stakeholder (see above); purely mechanical backstage cells (a
cron job owes nobody a value prop); scenarios where value_props are wholesale
unset (skip — that's wave-2 absence, not a ledger hole).
