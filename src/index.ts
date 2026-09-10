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
 * `App` takes one other optional prop, `sessionOverlay`: a component mounted
 * under the database client and above everything that reads it, for tooling
 * an installation runs and the application does not know about. `config`
 * skins the tree from outside, which cannot reach that far in. This kit's own
 * developer portal is what fills it here, from `src/main.tsx` and only in a
 * development build; a host that has no such tooling passes nothing.
 *
 * Consumed as source (see `deploymentConfig.ts`): the host's bundler resolves
 * this repo's `@/` alias and Vite's `import.meta.env` / `?raw` imports.
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
  asbDefaultConfig,
  resolveDeploymentConfig,
  type DeploymentConfig,
  type ResolvedDeploymentConfig,
} from './deploymentConfig'
