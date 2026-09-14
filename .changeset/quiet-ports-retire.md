---
'agentic-service-blueprinting': patch
---

The backend ports are deleted; the identity and tier readers stay

The application declared a repository interface — one port per aggregate,
guarantees and round trips annotated per operation — and nothing ever
dispatched through it. The two implementations behind it were a read-only
fixture over the bundled sample and an in-memory store, and the conformance
suite that held them equivalent proved two hypothetical stores equal to each
other and to nothing that ships: the live call sites talk to PostgREST
directly. A seam no caller crosses is a description of an architecture rather
than an architecture, and this one had begun to be cited as though it were the
contract.

So the port types, both adapters, the two conformance levels as code and the
suite are gone. What actually varies between this template and a deployment is
the database type (`src/types/database.ts`, generated from the migrations and
re-checked by CI); the portable core is the contract and
`references/adapter-contract.md` is where the operations a backend must answer
are now stated, in prose, with their guarantees intact.

The identity and tier readers stay, in a home that says what they are:
`src/lib/identity.ts` carries the `Tier` vocabulary and `readTier`, which asks
the database `is_service_account()` rather than inferring the tier from a JWT
claim. `src/contexts/SupabaseProvider.tsx` calls it exactly as before.
`src/lib/backend/schemaVersion.ts` stays where it is — it is the TypeScript
half of the version list `references/ir-schema.json` owns, held equal by its
own test.

**A deployment that imported the ports**: none is known. This is a patch
because semver here is scoped to the plugin contract — the identifier lane —
and refactoring the template app is outside it however much of it moves; a
consumer forks that surface and takes the change as a visible merge conflict.
The package's `exports` do carry `"./*"`, so these files WERE reachable by
subpath; a deployment that imported `src/lib/backend/ports` for the `Tier` type
imports it from `src/lib/identity.ts` instead, and one that imported the
adapters or the conformance suite has no replacement in the template and should
vendor the deleted files from the previous tag — the honest answer for code
that was a hypothetical seam here too.

`Tier` loses its `authoring` member on the way. Nothing produced it and nothing
branched on it: a backend that had answered it would have been read as writing
nothing, so a backend that draws that line answers with the writing tier and
enforces the narrower one itself.
