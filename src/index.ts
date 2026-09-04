/**
 * The package's library entry point.
 *
 * An external deployment mounts this template by importing `App` from the
 * package root and rendering it with its own `DeploymentConfig`:
 *
 *   import { App, type DeploymentConfig } from 'agentic-service-blueprinting'
 *   createRoot(el).render(<App config={deploymentConfig} />)
 *
 * Standalone, this repo's own `src/main.tsx` renders `App` with no config and
 * never touches this module — the two entry points are independent. Only the
 * deployment seam is exported here; the app's internals stay internal.
 */
export { App } from './App'
export {
  asbDefaultConfig,
  resolveDeploymentConfig,
  type DeploymentConfig,
  type ResolvedDeploymentConfig,
} from './deploymentConfig'
