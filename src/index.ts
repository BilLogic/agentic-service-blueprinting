/**
 * The package's library entry point.
 *
 * An external deployment mounts this template by importing `App` from the
 * package root and rendering it with its own `DeploymentConfig`:
 *
 *   import 'agentic-service-blueprinting/styles.css'
 *   import { App, type DeploymentConfig } from 'agentic-service-blueprinting'
 *   createRoot(el).render(<App config={deploymentConfig} />)
 *
 * The stylesheet is the host's to import — `App` does not, so a host owns the
 * one place its CSS loads. Standalone, this repo's own `src/main.tsx` imports
 * the same file and renders `App` with no config, and never touches this
 * module — the two entry points are independent. Only the deployment seam is
 * exported here; the app's internals stay internal.
 *
 * Consumed as source (see `deploymentConfig.ts`): the host's bundler resolves
 * this repo's `@/` alias and Vite's `import.meta.env` / `?raw` imports.
 *
 * WHERE THE HOST'S OWN FILES GO: `deployment/`, reached by `~/…`. A host that
 * mounts this package has no `src` of its own — `@/…` has to find the package,
 * and the first root that exists wins, so a `src` holding only the host's
 * files would capture every one of those imports and resolve none of them. The
 * build files a host holds identical to this repository's already name the
 * other root, its alias and its tests; `vite.config.ts` carries why.
 *
 * TWO SEAMS DO NOT ARRIVE THROUGH THE CONFIG, and cannot: the localStorage
 * namespace and the agent's extra reference documents are both settled while
 * this package's modules evaluate, which is before `App` renders anything. A
 * host settles them from `agentic-service-blueprinting/bootstrap`, in a module
 * it imports before this one — see `bootstrap.ts`, which is deliberately not
 * re-exported here, because reaching it through this module would evaluate
 * `App` first and defeat the point.
 */
export { App } from './App'
export {
  asbDefaultCellBudget,
  asbDefaultConfig,
  resolveDeploymentConfig,
  type CellContentBudget,
  type CellContentBudgetOverlay,
  type CellContentBudgetRung,
  type DeploymentConfig,
  type ResolvedDeploymentConfig,
  type ResolvedStoryboardConfig,
  type StoryboardConfig,
} from './deploymentConfig'
/**
 * The diagrams this package draws of its own model, ready to place on a cover.
 *
 * A VALUE, not a type, and the only one on this seam — because these are the
 * one part of a cover that is not the host's to write. They explain the
 * blueprint model rather than any service, so a host that had to supply them
 * would be supplying somebody else's explanation. Each is a module import, so
 * it travels into whatever the host builds; a host that wants its own writes
 * its own figure, or spreads one of these and changes the field that differs.
 */
export { packageCoverFigures } from './components/cover/packageCoverFigures'
export type { PackageCoverFigureName } from './components/cover/packageCoverFigures'
/**
 * The cover's content model, exported because `DeploymentConfig.cover` takes a
 * whole one: a host writes its landing page as a typed module of its own, and
 * without these it would be writing it against a type it cannot name. Types
 * only — the renderers stay internal, which is the point of the split.
 */
export type {
  CoverContent,
  CoverContentTab,
  CoverFigure,
  CoverGuideLink,
  CoverPortraitImage,
  CoverSection,
  CoverServicePage,
  CoverServicesIndex,
  CoverServicesTab,
  CoverTab,
} from './components/cover/coverModel'
/**
 * The offline board's two halves, named.
 *
 * `sample.nav` takes a `NavItem[]` and `sample.blueprints` a
 * {@link SampleBlueprintRegistry} — the two a deployment has to write down to
 * hold its own generated content in a module of its own. Without them here the
 * only spelling left is a path into `src/data/…`, which exists in a tree that
 * has its own `src` and in no other, so a deployment either reached for a path
 * it does not have or rebuilt the shape out of `DeploymentConfig` by hand.
 * `SlideViewType` comes with the nav because it is what a row's `layout` is.
 *
 * Types only, and that is the seam rather than a shortcoming: the registry is
 * HANDED to the config, never registered by calling anything, so the lookups
 * it feeds stay internal the way every other reader here does.
 */
export type { SampleBlueprintRegistry } from './data/blueprintFallbacks'
export type { NavItem, SlideViewType } from './types/nav'
/**
 * And what a board is made of, down to the cell.
 *
 * `BlueprintData` alone is enough to annotate a whole generated board, because
 * a literal of the right shape satisfies it structurally. It is not enough to
 * write the helper that BUILDS one — a function taking a lane, a step or a
 * cell has to name that type in its signature, and a deployment reshaping an
 * export of its own board writes exactly those functions.
 *
 * The closed vocabularies underneath — a path's kind, a cell's touchpoint role
 * — stop here on purpose: they are string unions any literal satisfies, they
 * belong to other seams of this package, and a deployment that needs one in a
 * signature indexes for it (`BlueprintPath['kind']`) rather than importing a
 * second name that could drift from the first.
 */
export type {
  BlueprintCell,
  BlueprintCellDependency,
  BlueprintData,
  BlueprintLane,
  BlueprintPath,
  BlueprintStep,
  CellResource,
  CellTouchpoint,
  ResourceKind,
} from './types/blueprint'
