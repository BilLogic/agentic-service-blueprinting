---
'agentic-service-blueprinting': patch
---

Every source file ends with a newline, and a test keeps it that way.
`overviewPathFilters.ts` did not, which is unfixable on the consuming side —
a deployment holding that file byte-identical differs from it by one absent
byte, and one absent byte was blocking an enrolment.
