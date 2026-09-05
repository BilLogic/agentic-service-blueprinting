/**
 * A service's route slug — its own `slug` column, with a name-derived fallback.
 *
 * A deployment routes by service slug: `/<slug>` opens that service, and a
 * scoped agent read names it. `21000130000000_a_service_has_a_slug` added the
 * column, so the slug is the service's OWN identity: stable across renames,
 * unique by constraint. This module reads that column.
 *
 * The name-derivation stays as a DEFENSIVE fallback, for a row whose slug is
 * somehow null — the column is nullable, so a deployer who clears the slug gets
 * the name-derived route rather than a broken one. The derivation mirrors the
 * database's `key_slug`: lowercase, every run of non-alphanumerics becomes a
 * single hyphen, ends trimmed; a name that slugifies to nothing (all non-ASCII)
 * falls back to the row id, so every service still has a stable, unique,
 * resolvable slug even with no column value.
 */

export type ServiceIdentity = { id: string; name: string; slug?: string | null }

/**
 * Slugify a service name the way `public.key_slug` does for ASCII input:
 * `trim('-', regexp_replace(lower(value), '[^a-z0-9]+', '-'))`. May be empty
 * when the name has no ASCII alphanumerics — callers pair it with the id.
 */
export function slugifyServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The route slug for a service: its own `slug` column when set, otherwise the
 * name-derived fallback (slugified name, or the id when that empties).
 *
 * The column is the normal path — reading it is what keeps a URL stable across
 * a rename. Deriving from the name is only the defensive branch for a null (or
 * empty) column value.
 */
export function serviceSlug(service: ServiceIdentity): string {
  const stored = service.slug
  if (stored != null && stored !== '') return stored
  return slugifyServiceName(service.name) || service.id
}

/**
 * The service a route slug names, or `null` when none matches. Comparison is
 * case-insensitive so a hand-typed `/Support-Desk` still resolves.
 */
export function resolveServiceBySlug<T extends ServiceIdentity>(
  services: readonly T[],
  slug: string,
): T | null {
  const target = slug.toLowerCase()
  return services.find((service) => serviceSlug(service).toLowerCase() === target) ?? null
}
