---
'agentic-service-blueprinting': patch
---

A write that is refused is translated, never forwarded raw.

`AuthoringError` and `toAuthoringError` have been here since the authoring path
was built, and two of the modules that write around them: thirteen throws
raised `new Error(error.message)`, which sends the database's own text to the
panel — `new row violates row-level security policy for table "phases"` is not
a sentence to show a reader — and discards `.raw`, the only place the original
survives. `sliceMutations.ts` had twelve of them and `cellSpecMutations.ts` the
thirteenth.

`src/lib/writeTranslationContract.test.ts` is what keeps it true. The rule is
scoped to the modules that WRITE and deliberately no wider: a hook raising
`error.message` from a `.select()` is a different problem with a different
answer, and a rule over every file would be a list of exemptions instead. The
writers are matched by shape — `lib/*Mutations.ts`, anchored at `lib/` so a
`components/FooMutations.ts` cannot route around the test — plus
`authoringRpc.ts` named, and both halves are asserted to still match something
so a rename fails loudly rather than emptying the set.

The regex is exercised on strings it never read off disk, because a source
scan passes just as happily when it matches nothing: the two raw shapes fail,
and a translated throw and a hand-written sentence pass.

Measured rather than estimated. Under this rule the repository had thirteen
offenders in two files; the same regex over all of `src/` returns seventy-two,
and the other fifty-nine are reads, which is the reason for the scope.

`src/lib/cellSpecMutations.ts` is byte-identical to the deployment's copy as a
result, so it can be held to this one.

NOT changed, and it is a real choice: `optimisticConcurrency.ts` still raises
around the translator, and its comment says why — the PostgREST error is left
to the caller, which knows whether it wants `toAuthoringError`. The deployment
translates there instead. That is a difference of position rather than drift,
and it is decided on its own.
