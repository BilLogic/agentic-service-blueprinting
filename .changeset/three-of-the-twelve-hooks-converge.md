---
'agentic-service-blueprinting': patch
---

Three of the twelve differing hooks converge, and the other nine are held by
three named things rather than by drift.

Twelve files under `src/hooks/` differ from their copies in the deployment this
kit was generalised from by fewer than twenty lines each, which reads like
drift. It is not. Roughly eighty of those hundred-odd lines are a single
unported feature appearing once per file, and most of the rest are differences
that cannot converge at all while they stay where they are.

**What converged.**

  `useScenarioPaths.ts`     the embedded-resource alias goes.
                            `scenario:scenarios(name)` and `scenarios(name)`
                            fetch the same row through the same embed, and the
                            alias only renamed a key this file casts anyway.
                            Every other hook that embeds a parent names the
                            relation plainly.
  `useSliceScenarioId.ts`   the cache key is sorted before it is joined. The
                            lookup is `.in('id', …)`, which answers the same
                            scenario for any permutation of the same ids, so
                            reordering a slice's frames used to mint a fresh
                            key for an answer already held — a round trip, and
                            a second entry kept beside the first. `sliceScenarioKey`
                            is exported, as it is there.
  `useServicePhases.ts`     a doubled word, with three more of the same
                            artefact fixed alongside it in `useSlices.ts`,
                            `lib/service.ts` and `CreateSliceSheet.tsx`. The
                            journey-to-service rename replaced the word in a
                            phrase that already carried it, and one of the four
                            is an error message a slice author can hit.

**What holds the other nine, in three groups.**

*The read lifetime.* Every one of the twelve passes an abort signal into its
request — `async (client, signal)` and `.abortSignal(signal)` — because there
the query wrapper hands the fetcher one. Here it does not. That contract is
`useSupabaseQuery.ts` plus `lib/supabaseFetchTimeout.ts` (a `Promise.race`
becomes a real deadline that aborts the request it bounds, and a named timeout
error), `lib/queryClient.ts` (which retries that error and not the others),
`lib/service.ts` (`awaitOrAbort`, so a caller can stop waiting on a shared
lookup without cancelling it for everyone else) and `useCanvasBlueprints.ts` —
six files, none of them in this cluster, two of them fifty lines apart on their
own account. It is its own piece of work and wants its own ticket; until it
lands, no hook in this cluster can be byte-identical, which is why three of the
twelve converged and not twelve.

*Prose written in a deployment's vocabulary.* `useOwnerTags.ts`,
`useLaneSpec.ts` and `useStakeholders.ts` illustrate their arguments with that
deployment's own party names, and `useCellDeepLink.ts` describes its share link
in terms of that deployment's bot, channel and documentation path. This side is
the general one and should stay so — the fix is on the other side, and it is
the only class of difference here where the template is ahead. `useStakeholders.ts`
also cites the catalog decision by number, which is ADR 3 here and a different
number there; a citation that cannot mean the same thing in both copies has to
be the template's number in both, or not a number at all.

*A schema this template does not have.* `useArchiveAvailable.ts` probes for the
recovery archive before any delete affordance ships. The probe names
`deleted_structure` here because that is the table `portable-core.schema.sql`
carries and the one the delete functions write to; there it names a `trash`
view over an authoring-change log that replaced it. Taking the newer name would
make the probe answer no on every database this template can build, which is
the exact failure the hook exists to prevent. It converges when the migration
does, and not before.

`useEvidence.ts`, `useScenarioSpec.ts`, `usePhaseSpec.ts` and `useStepSpec.ts`
differ in nothing except the abort signal, so they converge in full the day the
read lifetime does.
