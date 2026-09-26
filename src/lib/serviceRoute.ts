/**
 * The service route — the one module that owns how a service slug lives in the
 * URL path.
 *
 * A deployment routes by service slug: the first path segment names the active
 * service (`/support-desk`), and the view query params (`urlViewState.ts` —
 * `?cell=`, `?slice=`, …) ride alongside it. The two are orthogonal: this
 * module reads and writes the PATH, `urlViewState` reads and writes the SEARCH,
 * so a deep link like `/support-desk?cell=<id>` carries both the service and
 * the cell.
 *
 * Deliberately hand-rolled, no router dependency — it mirrors how
 * `urlViewState`/`viewStateStore` already own the URL by hand, and keeps the
 * single-service path (its slug in the path, nothing else changed) identical to
 * how the app writes URLs today via `history.replaceState`.
 *
 * Both functions work on the APP's path: a host that serves the app under a
 * prefix (`lib/basePath.ts`) has that prefix taken off before the slug is read
 * and put back when one is written, so `/demo/support-desk` names the service
 * `support-desk` and the prefix is never mistaken for one.
 */

import { toAppPath, toServedPath } from '@/lib/basePath'

/**
 * The active service's slug from the browser's pathname, or `null` at the bare
 * root — `/`, or the base path itself.
 */
export function parseServiceSlug(pathname: string, base?: string): string | null {
  const segment = toAppPath(pathname, base).split('/').filter(Boolean)[0]
  if (!segment) return null
  try {
    return decodeURIComponent(segment).toLowerCase()
  } catch {
    // A malformed percent-escape is not a reason to lose the route.
    return segment.toLowerCase()
  }
}

/**
 * The browser path for a slug, under the base path, preserving the caller's
 * search string. `null` maps to the bare root, which is the pre-resolution
 * state before a service is known.
 */
export function serviceRoutePath(slug: string | null, search = '', base?: string): string {
  const path = slug ? `/${encodeURIComponent(slug)}` : '/'
  return toServedPath(`${path}${search}`, base)
}
