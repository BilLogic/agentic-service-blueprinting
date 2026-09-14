/**
 * The package's PRE-IMPORT entry point — what a host has to settle before
 * the app's modules evaluate.
 *
 * `index.ts` exports the mount: `App` and the `DeploymentConfig` it renders
 * with. That covers every value read while the app RENDERS, the agent's
 * reference documents and doctrine included (they are read when a document
 * is served, from `agent.references` and `agent.doctrine`). It cannot cover
 * a value read while the app's modules LOAD, and one is: the localStorage
 * namespace (six modules build their key at module scope, two of them read
 * storage there). Importing that setter from `index.ts` would be
 * self-defeating — reaching it would evaluate `App` first, which is the
 * exact thing it has to precede.
 *
 * So it lives here, in a module whose import graph is EMPTY of the app:
 *
 *     // main.tsx — the deployment's entry
 *     import './deploymentBootstrap'
 *     import 'agentic-service-blueprinting/styles.css'
 *     import { App } from 'agentic-service-blueprinting'
 *
 *     // deploymentBootstrap.ts — its own module, so it evaluates first
 *     import { configureStorageNamespace } from 'agentic-service-blueprinting/bootstrap'
 *
 *     configureStorageNamespace('acme-')
 *
 * ES modules evaluate depth-first in source order, so a bootstrap module named
 * on the line above the app's import is guaranteed to have run. Nothing here
 * relies on that guarantee being remembered, though: the seam freezes on
 * first read and throws on a late call, so a host that gets the order wrong
 * gets an error naming the fix rather than an app quietly running on the
 * template's default.
 *
 * `bootstrap.test.ts` holds this module's import list to exactly the seam
 * module, because "imports nothing from the app" is the entire contract and
 * one convenience re-export would end it.
 */
export {
  configureStorageNamespace,
  currentStoragePrefix,
  STORAGE_PREFIX,
} from './lib/storageNamespace'
