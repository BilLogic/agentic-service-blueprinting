---
'agentic-service-blueprinting': patch
---

The offline board is a value the provider hands down, not a slot it writes while rendering

`data/blueprintFallbacks.ts` kept the settled registry in a module-level
variable. One writer — `DeploymentConfigProvider`, inside a memo, during its
own render — and every lookup reached for that variable while it drew. The
comment defended the render-time write as idempotent, and for one provider in
one tree it was. What it never covered is the second occupant: two providers
share one slot and the last render wins, a render React abandons still writes,
and ten of the twelve test modules that mount the provider never put the slot
back, so a board could outlive the file that built it.

The registry now becomes an `OfflineBoard` — the same lookup tables, built once
over a registry and handed back as a value. The provider builds one and puts it
on a context beside the config; `useOfflineBoard()` is what a surface reads, and
every lookup takes the board as its first argument. Readers with no hooks above
them — the nav model, the slice scan, the blueprint resolver, the agent's
no-database reads — take it from whoever called them, which for a tool call is
`ctx.offlineBoard`, handed down from the panel the way the scope and the roster
already are. Outside a provider the context answers the package's own board,
which is exactly what the module variable held before anyone wrote to it.

Nothing a person sees changes: the bundled sample and a deployment's board draw
the same cells they drew, `sample.blueprints` takes the same registry or loader
and still resolves once before the board draws, and the generator's
`--registry-out` / `--nav-out` output is untouched. What changes is that a board
belongs to a tree — proven by two providers with two registries drawing their
own boards side by side — and the `afterEach` resets are gone.

No deployment-facing export changed: `SampleBlueprintRegistry` and
`SampleBlueprintRegistryLoader` are still the package's only exports here, and
they are unchanged. `configureSampleBlueprints` is gone, but it was never
exported from the package entry.
