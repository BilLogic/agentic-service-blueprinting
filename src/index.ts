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
 * ONE SEAM DOES NOT ARRIVE THROUGH THE CONFIG, and cannot: the localStorage
 * namespace is settled while this package's modules evaluate, which is before
 * `App` renders anything. A host names it with `configureStorageNamespace`
 * from a module it imports BEFORE this one:
 *
 *   // main.tsx
 *   import './deploymentBootstrap'   // calls configureStorageNamespace
 *   import { App } from 'agentic-service-blueprinting'
 *
 * `lib/storageNamespace.ts` carries the reasoning and the guard that makes a
 * late call throw; `deploymentConfig.ts` records why it is not a field.
 */
export { App } from './App'
export {
  configureStorageNamespace,
  currentStoragePrefix,
  STORAGE_PREFIX,
} from './lib/storageNamespace'
export {
  asbDefaultConfig,
  resolveDeploymentConfig,
  type DeploymentConfig,
  type ResolvedDeploymentConfig,
} from './deploymentConfig'
