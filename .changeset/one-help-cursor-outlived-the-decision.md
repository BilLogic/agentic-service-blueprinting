---
'agentic-service-blueprinting': patch
---

One `cursor-help` outlived the decision that retired it. Three files already
say the help cursor is gone — `panelText.ts` names it as one of the two cues
that announced a word was defined, `EntityHeader.tsx` says "no `cursor-help`",
`panelShell.tsx` says the same — and a badge in the design toolbar still had
one. The class is removed, and `definitionCard.test.tsx` now asserts that none
survives anywhere, so the next one fails a test rather than a reading.
