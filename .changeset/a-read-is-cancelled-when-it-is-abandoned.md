---
'agentic-service-blueprinting': patch
---

A read that outlives the thing that wanted it is cancelled, not merely ignored.

`useSupabaseQuery` now hands its fetcher an abort signal alongside the client,
and every read passes it to the request (`.abortSignal(signal)`). Leaving a
view, or changing a query's key, ends the request it started instead of leaving
it on the wire to arrive, be parsed, and be dropped — on the connection that
was already too slow, which is the connection that could least afford it.

The deadline underneath changed shape to make that possible.
`raceSupabaseQuery` was a `Promise.race` between the request and a timer, and
racing only decides which answer the caller sees: the loser stayed in flight,
and nothing cleared the timer, so a request answered in 200ms still held a
ten-second one. `withSupabaseTimeout` runs the read under a real deadline,
aborts it when the deadline passes, chains in the caller's own cancellation,
and clears up after itself. It throws a named `SupabaseTimeoutError`, which is
what lets `queryClient` tell "this attempt was too slow" — worth one more —
from "the database said no", which would answer the same however often it is
asked and is still not retried.

`awaitOrAbort` covers the one read that cannot take a signal.
`findFirstServiceId` shares one in-flight promise between callers, so
cancelling it would cancel the lookup everyone else is awaiting; wrapping the
*wait* rather than the *lookup* lets a caller stop waiting without stopping the
request. Without it the deadline aborted a controller the shared request never
saw, and a read that was supposed to be bounded sat in `loading` until the
network answered.

The tests assert the behaviour, not the plumbing. That a fetcher is handed an
`AbortSignal` is a fact its type already states; that abandoning the read ENDS
it is the thing worth failing on, so every fetcher in
`useSupabaseQuery.test.tsx` answers only when it is cancelled — against a
wrapper that hands it nothing, the read hangs and the case reports that the
abandoned request was never cancelled. `readLifetime.test.ts` covers the pieces
underneath and `service.test.ts` covers `awaitOrAbort`.

Six hooks — `useEvidence`, `useScenarioPaths`, `useScenarioSpec`,
`useSliceScenarioId`, `usePhaseSpec` and `useStepSpec` — differed from their
copies in the deployment this kit was generalised from by this and nothing
else, and are now byte-identical to them. Four more (`useOwnerTags`,
`useLaneSpec`, `useStakeholders`, `useCellDeepLink`) are down to prose written
in that deployment's vocabulary, which is the one class of difference where
this side is the general one and the fix belongs on the other.
`useArchiveAvailable` and `useServicePhases` keep their own forks: the archive
probe names the relation this template's schema actually carries, and the
service resolution moves as one coordinated switch across several fetchers or
not at all.

`references/adapter-contract.md` says deadline rather than race, and asks a
replacement backend to accept a cancelled request rather than complete it.
Nothing here touches a skill name, reference filename, schema filename, agent
name, hook event or agent tool name, so it is a patch.
