/**
 * Vite's text and asset imports, for the bundler that is not Vite.
 *
 * The application reads its reference documents as TEXT — `role.md?raw`, the
 * eighteen documents `referenceDocs.ts` names, the four skill bodies — and
 * names the cover's figures as asset URLs. In the browser that is Vite's job,
 * and the app is written for it. A tool definition carries its `run` beside
 * its schema, so `tools/specs.ts` reaches the readers and the readers reach
 * those documents: anything bundling the tool surface outside Vite meets the
 * first `.md?raw` and stops, one message at a time —
 *
 *     [UNLOADABLE_DEPENDENCY] Could not load …/check-fee-visibility.md?raw
 *
 * — which is not a bug in the definition graph but a loader the bundle is
 * missing. This module IS that loader, and it is published (the `./vite-imports`
 * subpath) because the harness that meets this is usually a deployment's, not
 * this repository's: a consumer bundling the tool definitions installs the
 * package and calls one thing rather than keeping a copy of these ten lines
 * that drifts from what the app actually imports. This repo's own harness
 * takes it from here too — `scripts/agent-harness/surface.mjs` — so the loader
 * a consumer is handed is the loader this repository proves on every run.
 *
 * Text, not a file handle: `?raw` evaluates to the file's contents as a string
 * in the browser, so it does here. An asset evaluates to a URL string there,
 * and to its own path here — no bundler of this kind draws an SVG, and the
 * modules that name one never read what the string points at.
 *
 * JavaScript with a declaration beside it, like `overlay.mjs`, because a
 * consumer imports it BY PACKAGE NAME out of `node_modules`, where Node does
 * not strip types.
 */
import { readFileSync } from 'node:fs'

/** Vite's text-import suffix. */
const RAW_SUFFIX = '?raw'

/** The asset extensions the application imports for their URL. */
const ASSET = /\.(?:svg|png|jpe?g|gif|webp|woff2?)$/

/**
 * The loader as a rollup/rolldown plugin. It answers only for the two import
 * forms Vite adds and returns null for everything else, so it composes with
 * whatever else a bundle already carries.
 */
export function viteImportsPlugin() {
  return {
    name: 'asb:vite-imports',
    load(id) {
      if (id.endsWith(RAW_SUFFIX)) {
        const text = readFileSync(id.slice(0, -RAW_SUFFIX.length), 'utf8')
        return `export default ${JSON.stringify(text)}`
      }
      if (ASSET.test(id)) return `export default ${JSON.stringify(id)}`
      return null
    },
  }
}
