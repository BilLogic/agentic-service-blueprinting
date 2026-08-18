/**
 * Resource URLs, validated on the way in.
 *
 * Stricter than the render-side `safeExternalHref`, deliberately. That one
 * accepts `http:` because it guards *existing* data it did not choose, and
 * blanking a link someone already relies on is worse than rendering it. This
 * one guards new data, where there is no reason to accept plaintext.
 *
 * Both exist because "validated on write" and "validated on render" answer
 * different questions: whether to store it, and whether to trust what was
 * stored. Neither substitutes for the other — anything can reach the table
 * through the map skill or a seed.
 */

/** Schemes that may be stored. Anything else is refused, not coerced. */
const ALLOWED_PROTOCOL = 'https:'

export type ResourceUrlResult =
  | { ok: true; url: string }
  | { ok: false; problem: string }

/**
 * Normalise and check one resource URL.
 *
 * A bare `figma.com/file/…` is upgraded to `https://` rather than rejected —
 * typing the scheme is not something anyone should have to remember, and the
 * upgrade is unambiguous. `http://` is *not* upgraded: silently changing what
 * someone explicitly typed would hide that the link they have is insecure.
 */
export function validateResourceUrl(raw: string): ResourceUrlResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, problem: 'A resource needs a link.' }

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { ok: false, problem: `“${trimmed}” is not a link.` }
  }

  if (parsed.protocol !== ALLOWED_PROTOCOL) {
    return {
      ok: false,
      problem:
        parsed.protocol === 'http:'
          ? 'Use an https link — this one is http, which is not secure.'
          : `Links must start with https — “${parsed.protocol}” is not allowed.`,
    }
  }

  return { ok: true, url: parsed.toString() }
}

/** True when the URL is safe to store. Convenience for disabling a control. */
export function isStorableResourceUrl(raw: string): boolean {
  return validateResourceUrl(raw).ok
}
