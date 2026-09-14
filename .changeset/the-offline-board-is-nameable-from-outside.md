---
'agentic-service-blueprinting': patch
---

**A deployment can name the offline board it supplies.** `sample.blueprints`
has always taken a `SampleBlueprintRegistry` and `sample.nav` a `NavItem[]`,
and the package index exported neither. The only spellings left were a path
into `src/data/…`, which exists in a tree that has its own `src` and in no
other, or rebuilding the shape out of `DeploymentConfig` by hand —
`NonNullable<NonNullable<DeploymentConfig['sample']>['blueprints']>`, which is
what the first deployment to supply a board actually wrote (#771). Both are
exported now, with `SlideViewType` beside the nav and the board's own shapes
under the registry — `BlueprintData` and the `BlueprintPath`, `BlueprintLane`,
`BlueprintStep`, `BlueprintCell`, `BlueprintCellDependency`, `CellTouchpoint`,
`CellResource` and `ResourceKind` it is made of, because annotating a whole
generated board needs only the first and writing the function that builds one
needs the rest. Types only — the registry is handed to the config, never
registered by a call, so the lookups it feeds stay internal.

**`references/customization.md` § The offline board is two fields showed an
import nobody outside this repository could write.** Its example read
`PACKAGE_SAMPLE_BLUEPRINTS` out of `./data/blueprintFallbacks`, a relative path
into a `src` a deployment does not have; the deployment reading that page is
the one reader who cannot follow it. The example is a consumer's now — types by
package name, content from the deployment's own generated modules — and the
page says where those modules go and what their first lines import.

**`scripts/generate_fallbacks.py` can generate for a deployment's tree, not
only for this one.** `--register` rewrites marker blocks inside
`src/data/blueprintFallbacks.ts` and `src/data/sampleNav.ts`, which a
deployment has no copy of; it refused an `--out` outside `src/` and had nothing
else to offer. `--registry-out` and `--nav-out` write the two halves as
standalone modules that name their types by package name, and the generated
data module beside them names `BlueprintData` the same way, so a deployment's
own files carry no `@/…` path at all. The two flags are required together,
because the nav lists the scenarios and the registry draws them and one without
the other is rows over an empty canvas; they are refused alongside `--register`,
which generates for a different tree; and an `--out` under a `src` is refused,
because a deployment that grows one captures every `@/…` import the application
makes of itself.
