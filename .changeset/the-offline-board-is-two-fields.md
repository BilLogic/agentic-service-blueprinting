---
'agentic-service-blueprinting': patch
---

**A deployment's offline board now has a config home for its CONTENT, beside
the one its navigation already had.** `sample.nav` is the phases and scenarios
a build shows before a database answers, and it replaces rather than merges —
so a deployment that supplied its own nav drew those rows over the template's
fallback registry, which is keyed by the template's own scenario and path ids
and answers none of a deployment's. The result was a sidebar of real rows above
an empty canvas in every no-database build, and a render walk that failed on
the first board it asserted (#754).

The board's content is `sample.blueprints`, taking a `SampleBlueprintRegistry`
— scenario id to that scenario's paths — in exactly the shape
`scripts/generate_fallbacks.py --register` already writes into
`src/data/blueprintFallbacks.ts`. So a deployment hands the config what its own
import pipeline produced, both halves from the one run:

```ts
sample: { nav: SAMPLE_NAV, blueprints: PACKAGE_SAMPLE_BLUEPRINTS }
```

Supplied, that registry is what every offline lookup reads; omitted, the
package's own stands, and a clone of this repository runs exactly as it did.
`DeploymentConfigProvider` writes it onto the fallback module while it renders
rather than in an effect — the board asks for its lanes and cells during its
own render, and a module write re-renders nobody, so an effect would leave the
first paint with nothing to correct it.

`src/contexts/deploymentSampleBoard.test.tsx` holds it at the level the failure
appeared: a provider handed a deployment's config and nothing else, and the
hook the canvas reads returning that deployment's paths, lanes and cells — and
the template's own scenario answering nothing while it is in force.
`references/customization.md` § The offline board is two fields names both, and
the render walk's enrolment list says a deployment's walk needs them.
