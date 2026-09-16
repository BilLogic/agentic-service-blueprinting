---
'agentic-service-blueprinting': patch
---

A definition popover prints its term in sentence case, and no definition
repeats the word above it.

The definition card's term stops borrowing the shared `Eyebrow` — a lane,
status, entity or divider badge reading `Frontstage` is now answered by a card
that spells the word the same way, instead of in the uppercase register
section labels use. The section eyebrows elsewhere are untouched.

A lane role is a label and a body rather than one `Name — meaning` sentence the
badge parsed on its em dash, so all eight bodies start with what the role means
instead of naming it again. `references/lane-roles.md` carries the same table.

One guard, `src/lib/definitionsSayItOnce.test.ts`, holds the rule across every
module that feeds a definition — lane roles, entity status, panel terms, entity
kinds, touchpoint roles, stakeholder kinds, the divider meanings and the cover's
definition tables. The rule itself moved into the entity-panels composition
guideline.
