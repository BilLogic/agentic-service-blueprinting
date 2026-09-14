---
'agentic-service-blueprinting': patch
---

`sample.blueprints` takes a loader, so an offline board rides only in the builds that draw it

A deployment's offline board is the largest value it hands the config — around
1.2 MB of cells for an export of a real board, roughly 140 kB gzipped — and it is read on one
condition, `isBundledSampleActive()`. Handed over as a value it was reachable
from the config module, so every build carried it, including the production
build with a database where nothing ever asks for it.

The field now takes either the registry or a
`SampleBlueprintRegistryLoader` — `() => import('./data/sampleBlueprints').then((m) => m.SAMPLE_BLUEPRINTS)` —
and a loader's only reference to those bytes is inside a dynamic import, which
is a chunk boundary to every bundler. `DeploymentConfigProvider` calls it only
when the bundled sample is reachable, and awaits it before rendering the tree
below, because the board reads the registry while it draws. A loader that
rejects throws rather than falling back to the template's own board, which
answers a deployment's identifiers nothing — the provider is outermost, so that
surfaces as a blank page and a console error unless the host supplies a
boundary above `App`.

The eager form is unchanged and needs no migration.
