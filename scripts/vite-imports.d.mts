/**
 * Types for `vite-imports.mjs`; the account of the module is in that file.
 */

/**
 * A rollup/rolldown plugin, stated structurally: this module is imported by
 * bundles that do not all carry the same bundler's types.
 */
export type ViteImportsPlugin = {
  name: string
  load(id: string): string | null
}

/** Vite's `?raw` and asset imports, for a bundler that is not Vite. */
export function viteImportsPlugin(): ViteImportsPlugin
