/**
 * Reading a path that a LISTING handed you, when the listing is already old.
 *
 * Every sweep in this repository works in two steps: ask for a set of paths,
 * then open each one. The two steps are not one moment. `git ls-files` reports
 * the INDEX, and the index goes on naming a file after the working tree has
 * stopped having it — which is exactly the state `npm run version` leaves
 * behind, in the seconds between `changeset version` consuming the changeset
 * files and `git add` recording that they are gone. A sweep that runs in that
 * window is handed a path with nothing at the end of it.
 *
 * That has now cost three separate walks (#180's successor in
 * `check-standalone.mjs`, the badge-and-tag walk in 1.41.0, and
 * `standalone.test.mjs` in #632), each fixed on its own, each fixed slightly
 * differently, and the third one only because someone cutting a release
 * noticed a red suite and looked rather than re-running. Three is where the
 * rule stops being worth writing out again: it lives here, once, and every
 * walk reads it from the same place.
 *
 * ── The rule, and the two cases it keeps apart ─────────────────────────────
 *
 * A path that VANISHED between the listing and the read is normal. The listing
 * was true when it was taken; nothing is wrong with the tree, the walk, or the
 * code under it. Skip it.
 *
 * A path that cannot be read FOR ANY OTHER REASON is a fact about the tree
 * worth hearing — a permission the checkout should not have, a directory where
 * a file belongs, a device error. Throw.
 *
 * The distinction is the whole point, and the reason this is a function rather
 * than a `try {} catch {}` typed out at each site. A bare catch swallows both,
 * which trades a loud failure for a silent one: a sweep that skips every file
 * it cannot open reports nothing and looks exactly like a clean tree. That is
 * strictly worse than the crash it replaces, and it is what four of the sites
 * this replaced were already doing.
 *
 * ── Only ENOENT ────────────────────────────────────────────────────────────
 *
 * Some of the catches this consolidates also claimed to cover a SUBMODULE — a
 * gitlink, which `git ls-files` names like a file and which reads as `EISDIR`.
 * This tree has no `.gitmodules` and no gitlink has ever been listed in it, so
 * that clause was covering a case that has never happened. It is not carried
 * over: a gitlink appearing in a sweep's subject changes what the sweep is
 * measuring, and that is news rather than noise. If one ever lands, this
 * throws and says so.
 *
 * ── Skipping cannot be allowed to shrink the subject quietly ───────────────
 *
 * A walk that skips is safe only while something counts what came back. Each
 * caller pairs this with a breadth assertion over its own subject — the
 * subjects differ, so the count cannot live here.
 */
import { readFileSync } from 'node:fs'

/**
 * The contents of `path`, or `null` if it is no longer there.
 *
 * @param {string} path An absolute path, or one relative to the process cwd.
 * @param {BufferEncoding} [encoding]
 * @returns {string | null} `null` only for a path that has gone; every other
 *   failure throws.
 */
export function readListed(path, encoding = 'utf8') {
  try {
    return readFileSync(path, encoding)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
