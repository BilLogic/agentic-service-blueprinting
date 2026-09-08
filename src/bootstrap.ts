/**
 * The package's PRE-IMPORT entry point — everything a host has to settle
 * before the app's modules evaluate.
 *
 * `index.ts` exports the mount: `App` and the `DeploymentConfig` it renders
 * with. That covers every value read while the app RENDERS. It cannot cover a
 * value read while the app's modules LOAD, and two of them are: the
 * localStorage namespace (six modules build their key at module scope, two of
 * them read storage there) and the agent's reference documents (the served
 * record, the vocabulary, and the tool description that quotes it are all
 * built at module scope). Importing those setters from `index.ts` would be
 * self-defeating — reaching them would evaluate `App` first, which is the
 * exact thing they have to precede.
 *
 * So they live here, in a module whose import graph is EMPTY of the app:
 *
 *     // main.tsx — the deployment's entry
 *     import './deploymentBootstrap'
 *     import 'agentic-service-blueprinting/styles.css'
 *     import { App } from 'agentic-service-blueprinting'
 *
 *     // deploymentBootstrap.ts — its own module, so it evaluates first
 *     import {
 *       configureStorageNamespace,
 *       registerReferenceDocs,
 *     } from 'agentic-service-blueprinting/bootstrap'
 *     import blueprintAccount from './docs/blueprint.md?raw'
 *
 *     configureStorageNamespace('acme-')
 *     registerReferenceDocs({ blueprint: blueprintAccount })
 *
 * ES modules evaluate depth-first in source order, so a bootstrap module named
 * on the line above the app's import is guaranteed to have run. Nothing here
 * relies on that guarantee being remembered, though: both seams freeze on
 * first read and throw on a late call, so a host that gets the order wrong
 * gets an error naming the fix rather than an app quietly running on the
 * template's defaults.
 *
 * `bootstrap.test.ts` holds this module's import list to exactly the two seam
 * modules, because "imports nothing from the app" is the entire contract and
 * one convenience re-export would end it.
 */
export {
  configureStorageNamespace,
  currentStoragePrefix,
  STORAGE_PREFIX,
} from './lib/storageNamespace'
export { registerReferenceDocs } from './lib/agent/tools/referenceRegistry'
