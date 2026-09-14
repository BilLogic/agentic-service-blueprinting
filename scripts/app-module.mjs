/**
 * One application module, bundled so a plain `.mjs` script can read it.
 *
 * The scripts are Node, the application is TypeScript, and a script that wants
 * a list the application already holds had exactly two options before this:
 * import nothing and keep a hand copy, or parse the source with a regular
 * expression. Both are the same defect — a second statement of a fact that
 * already has one — and the hand copy is the worse half, because it is silent:
 * a descriptor added to the application is simply missing from the script, and
 * the script goes on printing what it printed last week.
 *
 * So a script asks for the module itself. `loadAppModule('lib/cellFields.ts')`
 * bundles that one file with rolldown — the `@/` alias pointed at whichever
 * root `app-source.mjs` finds, so a deployment reading the application out of
 * its package gets the same list from the same source — and hands back the
 * module namespace. The list a script then reads is the object the app reads,
 * not a copy of it.
 *
 * ONE MODULE PER CALL, on purpose. `scripts/agent-harness/surface.mjs` bundles
 * an ENTRY it keeps beside itself, because the harness wants many exports from
 * many modules under one name; a script that wants one list wants the module
 * that holds it and no entry file to keep in step. The `?raw`/asset plugin
 * below is a small duplication of that file's — see the comment there for what
 * each of the two shims is for. Factoring it out would give the harness's
 * bundle and a script's bundle one throat to choke for two different jobs, and
 * the harness's version carries the reasoning; this one is four lines.
 *
 * A bundle costs one in-process rolldown run per module per process. Two
 * scripts asking for the same module in one test run get one bundle: the
 * namespace is kept per path, so the second caller waits on the first's
 * promise rather than bundling again.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { appSourceRoot } from './app-source.mjs'

/** Vite's `?raw` and asset imports, for the bundler that is not Vite. */
const RAW_SUFFIX = '?raw'
const ASSET = /\.(?:svg|png|jpe?g|gif|webp|woff2?)$/
const viteImports = {
  name: 'vite-imports',
  load(id) {
    if (id.endsWith(RAW_SUFFIX)) {
      const text = readFileSync(id.slice(0, -RAW_SUFFIX.length), 'utf8')
      return `export default ${JSON.stringify(text)}`
    }
    if (ASSET.test(id)) return `export default ${JSON.stringify(id)}`
    return null
  },
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The module namespace of one application module, bundled.
 *
 * @param {string} pathUnderSrc The path under the application's source root —
 *   `lib/cellFields.ts`, not `src/lib/cellFields.ts`, because the root is the
 *   answer `appSourceRoot` gives and not the caller's to spell.
 */
const loaded = new Map()

export function loadAppModule(pathUnderSrc) {
  let pending = loaded.get(pathUnderSrc)
  if (!pending) {
    pending = bundleAppModule(pathUnderSrc)
    loaded.set(pathUnderSrc, pending)
  }
  return pending
}

async function bundleAppModule(pathUnderSrc) {
  const { rolldown } = await import('rolldown')
  const bundle = await rolldown({
    input: resolve(appSourceRoot(ROOT), pathUnderSrc),
    // Honor tsconfig's `@/*` path alias, on whichever root holds the application.
    resolve: { alias: { '@': appSourceRoot(ROOT) } },
    plugins: [viteImports],
    logLevel: 'silent',
  })
  const { output } = await bundle.generate({ format: 'esm' })
  await bundle.close()
  return import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`)
}
