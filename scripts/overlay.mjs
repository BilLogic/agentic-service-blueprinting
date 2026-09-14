/**
 * The Overlay: a deployment's source tree lies over the package's, per path.
 *
 * A deployment reads the application out of the package and keeps, in its own
 * `src`, only the files it still has a reason to hold — its Residents. For a
 * path under the application alias, the deployment's copy answers if it
 * exists, else the package's. That is the rule TypeScript's two-root `paths`
 * list already applies, module by module; this module makes the bundler and a
 * walk apply the same one, so a deployment can delete a resident the moment it
 * matches the package and nothing else has to move.
 *
 * It used to be all or nothing: the build's alias pointed at ONE root, the
 * first that existed, so a `src` holding a single file captured every `@/…`
 * import and resolved none of the rest. The all-or-nothing rule is withdrawn;
 * the decision that the deployment overlays the package per path records it.
 *
 * Two exports. `resolveOverlaid` is the rule as a function of paths and an
 * `exists` — a relative path, the layers, and which layer answers — for the
 * sweep and for anything else that has to land on the file the build would.
 * `overlayPlugin` is the same rule as a Vite plugin: it intercepts a path the
 * alias has already rewritten into the package's root and answers with the
 * overlay's file when the overlay has one. Nothing here names either root;
 * the caller passes the layers, overlay first and the package last, because
 * where they are is the build config's fact (see `vite.config.ts`).
 *
 * This file is JavaScript with a declaration beside it rather than
 * TypeScript because the build config imports it BY PACKAGE NAME at load
 * time, in a deployment, out of `node_modules` — and Node does not strip
 * types under `node_modules`. In this repository the same import resolves by
 * the package's own name (self-reference through `exports`). It lives in
 * `scripts/` because that is one of the five folders a published path may
 * name; it is not one of the shared scripts a deployment enrols — a
 * deployment reaches it through the package, never through a copy.
 */
import { statSync } from 'node:fs'
import path from 'node:path'

/** A file, not a directory: a directory of the same name is not a module. */
function isFile(candidate) {
  try {
    return statSync(candidate).isFile()
  } catch {
    return false
  }
}

/** `relativePath`, normalised to forward slashes and refused if it escapes. */
function inside(relativePath) {
  const normalised = path.posix.normalize(relativePath.split(path.sep).join('/'))
  if (
    normalised === '..' ||
    normalised.startsWith('../') ||
    path.posix.isAbsolute(normalised)
  ) {
    throw new Error(`not a path under the alias: ${relativePath}`)
  }
  return normalised
}

function atLeastTwo(layers) {
  if (layers.length < 2) {
    throw new Error(`an overlay is at least two layers; got ${layers.length}`)
  }
}

/**
 * The file in the first OVERLAY layer that holds `relativePath`, or null.
 * The package is not asked: what the overlay does not hold is the package's
 * by default, whether or not the package has it.
 */
function findInOverlay(relativePath, overlays, exists) {
  for (let layer = 0; layer < overlays.length; layer += 1) {
    const candidate = path.join(overlays[layer], relativePath)
    if (exists(candidate)) return { path: candidate, layer }
  }
  return null
}

/**
 * Which layer holds a path, and where.
 *
 * @param {string} relativePath A path under the alias, `lib/config.ts`; no
 *   query, no leading slash. Refused when it escapes the layers.
 * @param {readonly string[]} layers Absolute roots, overlay first and the
 *   package last. Two or more.
 * @param {(candidate: string) => boolean} [exists] What "exists" means; a
 *   file on disk by default, a fixture in a test.
 * @returns {{ path: string, layer: number, found: boolean }} The file in the
 *   first layer that has it; when none does, the path it would have under
 *   the package (`layer` is the last index and `found` is false), so an
 *   absent module fails where the package's own error names it.
 */
export function resolveOverlaid(relativePath, layers, exists = isFile) {
  atLeastTwo(layers)
  const normalised = inside(relativePath)
  const base = layers.length - 1
  const hit = findInOverlay(normalised, layers.slice(0, base), exists)
  if (hit) return { ...hit, found: true }
  const candidate = path.join(layers[base], normalised)
  return { path: candidate, layer: base, found: exists(candidate) }
}

/**
 * The spellings a bare specifier can stand for: the path as written, then
 * with each extension, then as a directory's index. The same order Vite's own
 * resolver tries, so an overlay file is found under the spelling the package's
 * would have been.
 */
function specifierCandidates(relativePath, extensions) {
  const candidates = [relativePath]
  for (const extension of extensions) candidates.push(`${relativePath}${extension}`)
  for (const extension of extensions) {
    candidates.push(path.posix.join(relativePath, `index${extension}`))
  }
  return candidates
}

/**
 * The overlay as a Vite plugin.
 *
 * The alias maps the prefix to the PACKAGE's root — the layer that is always
 * whole — and this plugin runs before Vite's resolver on every id under that
 * root, answering with the overlay's file when one of the overlay layers has
 * it under any spelling the resolver would try. When none does it returns
 * nothing, and Vite resolves the package's file the way it always did. A
 * query (`?raw`, `?url`) is carried across untouched.
 *
 * EVERY ID UNDER THE ROOT, HOWEVER IT WAS REACHED. An import the alias
 * rewrote and a relative import inside the package (`./blueprintLaneCollapse`
 * from a package module) both arrive here as the same absolute path, and
 * both are overlaid — so a path is one module, and a resident that holds a
 * store is the one store every importer shares. The other rule, overlaying
 * only what the alias reached, would load a resident for the deployment's
 * imports and the package's copy for the package's own, two instances of one
 * module and every module-level store split in half. This is also what the
 * deployment's build did before the overlay existed, when `src` was the whole
 * alias. What it costs: TypeScript checks a package module's relative import
 * against the package's file, so a diverged resident has to keep the exported
 * interface of the file it stands for — the residents list is where that is
 * held to account.
 *
 * @param {{ layers: readonly string[] }} options Absolute roots, overlay
 *   first and the package last — the same order `resolveOverlaid` takes.
 * @returns {import('vite').Plugin}
 */
export function overlayPlugin({ layers }) {
  atLeastTwo(layers)
  // Vite hands ids with forward slashes on every platform; the roots came
  // from `path.resolve` and are compared in the same spelling.
  const slashed = (value) => value.split(path.sep).join('/')
  const overlays = layers.slice(0, -1)
  const prefix = `${slashed(layers[layers.length - 1])}/`
  /** @type {readonly string[]} */
  let extensions = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']

  return {
    name: 'asb:overlay',
    enforce: 'pre',
    configResolved(config) {
      extensions = config.resolve.extensions
    },
    resolveId(id) {
      if (!slashed(id).startsWith(prefix)) return null
      const query = id.indexOf('?')
      const bare = query === -1 ? id : id.slice(0, query)
      const suffix = query === -1 ? '' : id.slice(query)
      const relativePath = inside(slashed(bare).slice(prefix.length))
      for (const candidate of specifierCandidates(relativePath, extensions)) {
        const hit = findInOverlay(candidate, overlays, isFile)
        if (hit) return `${hit.path}${suffix}`
      }
      return null
    },
  }
}
