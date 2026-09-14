/**
 * Types for `overlay.mjs`; the account of the module is in that file.
 */
import type { Plugin } from 'vite'

/** Where a path under the alias resolves: which layer, and the file there. */
export type OverlaidPath = {
  /** The file, absolute. When `found` is false, the path it would have under the package. */
  path: string
  /** Index into the layers passed in; the last index is the package. */
  layer: number
  /** Whether the file exists in the layer named. */
  found: boolean
}

/**
 * The first layer that holds `relativePath`, else the package's path for it.
 * `layers` is overlay first, package last; two or more.
 */
export function resolveOverlaid(
  relativePath: string,
  layers: readonly string[],
  exists?: (candidate: string) => boolean,
): OverlaidPath

/** The overlay as a Vite plugin; `layers` is overlay first, package last. */
export function overlayPlugin(options: { layers: readonly string[] }): Plugin
