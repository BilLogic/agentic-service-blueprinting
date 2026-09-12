---
'agentic-service-blueprinting': patch
---

Two component tests stop racing the clock, so a full `npm test` under parallel
load is green rather than green-on-the-second-try.

Both failures were timing, not behaviour. The editor-shell test in
`App.test.tsx` asked `screen` for two buttons by accessible name after the
whole editor had mounted, which computes a name — and a `getComputedStyle` —
for every one of the 272 buttons in the document; that alone was more than half
of a test already costing 1.65 s against vitest's five-second default, and a
loaded machine pushed the rest of the way. The queries are scoped to the rail
they are about, which is the stronger assertion as well as the cheap one, and
the test now costs 0.82 s. `boardAddressSync.test.tsx` waited a flat 20 ms for
the `popstate` that `history.back()` queues, and read the pre-back address when
the machine did not get there in time; it waits for the event instead.

`docs/guidelines/contributing.md` states both rules, because a suite that is
sometimes red for no reason teaches the person cutting a release to re-run
rather than to read.
