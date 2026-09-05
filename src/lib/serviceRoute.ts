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
 */

/** The active service's slug from a pathname, or `null` at the bare root `/`. */
export function parseServiceSlug(pathname: string): string | null {
  const segment = pathname.split('/').filter(Boolean)[0]
  if (!segment) return null
  try {
    return decodeURIComponent(segment).toLowerCase()
  } catch {
    // A malformed percent-escape is not a reason to lose the route.
    return segment.toLowerCase()
  }
}

/**
 * The path for a slug, preserving the caller's search string. `null` maps to
 * the bare root, which is the pre-resolution state before a service is known.
 */
export function serviceRoutePath(slug: string | null, search = ''): string {
  const path = slug ? `/${encodeURIComponent(slug)}` : '/'
  return `${path}${search}`
}
