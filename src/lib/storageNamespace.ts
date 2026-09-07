/**
 * The localStorage namespace this installation owns.
 *
 * A DECLARED FORK SEAM, and one of exactly two places where this kit and an
 * app built from it are expected NOT to converge. Every key written to
 * `window.localStorage` is prefixed, and the prefix names the INSTALLATION
 * rather than the code: this kit ships as `sb-*`, and an adopter is expected
 * to change the constant below to something of their own. Two installations
 * served from one origin would otherwise read each other's settings, sessions
 * and chat placement, so the prefix is the one thing about a stored key that
 * must differ per install.
 *
 * That is why this module exists instead of a string literal at each call
 * site. Every module that stores anything imports `storageKey` from here,
 * which leaves those modules identical across installations and confines the
 * difference to the constant. Do not inline the prefix again: an adopter
 * would then have to find and edit every call site, and would miss one.
 *
 * Change it ONCE, when adopting the kit. After that it is frozen: the keys
 * already sitting in readers' browsers carry it, and nothing migrates them,
 * so a later change silently forgets every saved API key, session list and
 * remembered path.
 */

/** Prefix on every localStorage key this app writes. */
export const STORAGE_PREFIX = 'sb-'

/** A namespaced localStorage key — `storageKey('agent-settings')`. */
export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}${name}`
}
