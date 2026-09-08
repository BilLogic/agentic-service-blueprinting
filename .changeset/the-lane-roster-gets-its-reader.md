---
'agentic-service-blueprinting': patch
---

The lane roster gets its reader, and the jargon lint stops naming a retired
role.

`BLUEPRINT_LANE_ROLES` was exported and read by nothing, beside a palette test
that retyped the role-to-family pairs by hand. The pairs are now read off the
`[data-blueprint-lane]` rules, so what is measured is what is drawn, and the
completeness check in `palette.test.ts` compares the selectors it parsed
against the exported roster rather than counting them — for touchpoint tones as
well as lanes. A count of nine cannot tell nine roles apart from nine typos; a
selector renamed out of the vocabulary now fails instead of quietly rendering
an unstyled row.

`skills/audit/references/check-jargon-lint.md` told a model auditing someone's
blueprint that `journey_stage` labels render as headers. `journey_stage` is not
one of the eight roles `lanes_lane_role_check` admits, and the thing that
renders as a header is a phase. The note now says so, and adds what the file
left out: a phase is not a lane, so the lane-role test in the next sentence
does not reach one.

The bump is a patch. Nothing here renames a skill, a reference filename, a
schema filename, an agent, a hook event or an agent tool — the identifier lane
semver is scoped to. `check-jargon-lint.md` keeps its name and its place; only
what it says has changed, and a reference document's content is not part of
that contract.
