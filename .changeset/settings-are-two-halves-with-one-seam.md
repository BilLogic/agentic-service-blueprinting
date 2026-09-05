---
'agentic-service-blueprinting': patch
---

The settings surface is two halves with one seam.

`AgentSettingsFields` was one 323-line component holding two jobs that share
nothing: the auth drafts, the busy flag and the magic-link state on one side,
the provider/model/key trio on the other, with no state crossing between them.
It is now `AdminSessionFields` and `AgentProviderFields` — each reading only
the context field it needs — and a 62-line composer that owns what genuinely
spans both: the column, the headings, the rule between them and the gate that
decides whether the second half exists at all. The split is the one a
deployment built on this template already made, taken here byte for byte, so
the two files stop diverging; `agentSettingsFields.test.tsx` pins the seam by
asserting which half is on screen for whom.

The move carries a fix. The model-list fetch gated on `open` — the global
`window.open`, always truthy — so the `active` prop it meant to read never
gated anything, and a closed settings surface still made the provider
round-trip. It reads `active` now.

Template-only affordances stay in the composer, each marked: the no-database
sample trial (an unconfigured build opens the key field with no session to
gain, and shows a sentence where the sign-in form would be) and
`DevPortalSection`. The scope field of that deployment's split is not here —
it needs a multi-service model this template does not have yet.
