---
'agentic-service-blueprinting': patch
---

`set_cell_dependency` is called with `name`, and the argument names are a check
now.

`21000116000000` renamed `cell_dependencies.label` to `.name` and moved the RPC
parameter with it, and `src/lib/authoringRpc.ts` kept posting `label`.
PostgREST resolves an RPC by matching the body's KEYS to a function's parameter
names, so a key the function does not have means no candidate matches at all:
the reply is `PGRST202 — could not find the function`, a 404 at the seam rather
than a null column. Every arrow saved from `CellDependencyEditor` failed, and so
did every `create_cell_dependency` the agent called. `client.rpc` is reached
through an `any` cast — the file says why, and it is a good reason — so nothing
in TypeScript could see it, and no guard was looking either.

The word moves end to end: the wrapper's input, `DraftDependency`,
`ExistingDependency`, the panel's field and its placeholder, and the generated
`Args` for the function. The agent tool keeps saying `label` and `registry.ts`
maps it, which is the deployment's spelling of the same seam: the word a model
is asked for is not the schema's, and moving a published surface for a spelling
costs more than the mapping does. `DeletionImpact.label` is untouched — that is
the deletion target's display label, and the deployment still spells it that
way.

**The guard that would have caught it**: `npm run check:rpc-arguments` reads
every RPC argument object in `authoringRpc.ts` — the `call`/`read` sites and
the revert specs, because an inverse posts the same body one undo later — and
holds their keys against the parameter lists parsed from
`supabase/generated/portable-core.schema.sql`. Three failures, each naming the
line: a key that is not a parameter, a parameter with no default the call omits,
and a function the dump does not have. The `p_` prefix is compared verbatim,
because PostgREST strips nothing and the `p_`-prefixed functions are called with
the prefix.

The rename map gains the other half of `21000115000000`: `slice_items` →
`slides`, and `slice_items.caption` → `slides.title`. It enforces nothing yet,
and the header says why rather than leaving the silence to be read as an
oversight — `slices_referencing` is `language sql`, so its body kept the text it
was created with and still selects `from public.slice_items`. Calling it raises
`42P01`. Keying the fragment today would fail the dump sweep on that defect
instead of on residue; finishing the rename is a migration of its own, and the
row is written down while that is true.

The plugin contract is untouched, so this is a patch: no identifier in
`identifiers.json` moves and no path in `check-reference-paths.mjs` does either.
