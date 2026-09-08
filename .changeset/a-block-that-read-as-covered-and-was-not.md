---
'agentic-service-blueprinting': patch
---

The cancellation block that never reached our cancellation is removed.

`readLifetime.test.ts` had a `query cancellation` block, and it tested nothing
of ours. It built a raw `QueryObserver` with a `queryFn` of its own, so what it
asserted was that TanStack aborts the signals it hands out — a library
guarantee, held whether or not `useSupabaseQuery` passes one on. Reverting the
read-lifetime port leaves all eleven cases in that file green while the two in
`useSupabaseQuery.test.tsx` fail on `seen?.aborted`, which is the difference
between a test that reads as covered and one that is.

Two cases are deleted and nothing replaces them here: both properties — the
consumer that leaves, and the read superseded by a key change — are already
asserted through the hook in `useSupabaseQuery.test.tsx`, where taking the
signal away makes them fail. Rewriting them against the hook would have been a
second copy of that file, which is its own defect.

The rest of `readLifetime.test.ts` is untouched and still bites: the deadline
that aborts the request it bounded, the timer that does not outlive the answer,
the caller's own cancellation, the one retry a timeout is worth, and the cache
retention. Both file headers now say which file owns cancellation, so neither
claims TanStack's guarantee as ours.
