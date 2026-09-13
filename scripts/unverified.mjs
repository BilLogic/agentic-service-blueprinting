/**
 * A CHECK THAT COULD NOT LOOK AT ITS SUBJECT SAYS SO, WHERE A PERSON SEES IT.
 *
 * Every guard here ends in one of two states, and the two are printed the same
 * way. It looked and found nothing wrong; or it COULD NOT LOOK — the database
 * was not configured, the folder it sweeps is not in this tree, the checkout
 * was handed no tags — and it exited 0 with a friendly sentence in a log
 * nobody opens. The second is the whole defect class this module exists for: a
 * green job that has stopped measuring anything goes on reporting success, and
 * the run that would have caught the defect is indistinguishable from the run
 * before it.
 *
 * THE FIX IS NOT TO FAIL. Several of these skips are correct. A repository
 * without a plugin surface has no folder to sweep; a pull request has no live
 * target to ask. What is wrong with them is that they are INVISIBLE. So a skip
 * goes through here, and lands in the two places a person actually looks:
 *
 *   - an annotation on stderr, which a workflow runner surfaces against the
 *     step rather than leaving it a thousand lines down inside the log;
 *   - a line in the run's summary, so a finished job carries a list of what it
 *     did not verify beside the list of what it did.
 *
 * IT IS NOT AN ERROR AND IT IS NOT A LOG LINE. An error would fail the correct
 * skips, and a guard whose readers have learned to ignore it is worse than no
 * guard. A log line is what these already were. A warning is the one register
 * that says "this passed, and here is the part of it that measured nothing".
 *
 * WHAT A CALLER SAYS. Two things, in the caller's own words: WHAT went
 * unverified — the subject, never the script — and WHY it could not be
 * reached, including what an owner would set or run to reach it. A warning
 * that names a script tells a reader where to look; one that names the subject
 * tells them what they now do not know.
 *
 * SAID ONCE PER RUN. A library reached from three checks would otherwise
 * annotate three times for one fact, and a reader counting annotations would
 * be counting call sites instead of subjects. The first statement of a fact is
 * kept and the rest are dropped.
 */
import { appendFileSync } from 'node:fs'

/** Facts already stated in this process, so a shared library says each once. */
const stated = new Set()

/** Whether the run summary has been given its heading yet. */
let headed = false

/**
 * `what` went unverified, because `why` — as a warning annotation and a line
 * in the run summary.
 *
 * Returns whether this call was the one that said it, so a test can drive the
 * de-duplication rather than describe it.
 *
 * @param {string} what The subject that was not measured.
 * @param {string} why Why it could not be reached, and what would reach it.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   write?: (text: string) => void,
 *   append?: (path: string, text: string) => void,
 * }} [io] The two sinks and the environment, as seams a test can hold.
 * @returns {boolean}
 */
export function unverified(what, why, io = {}) {
  const env = io.env ?? process.env
  const write = io.write ?? ((text) => process.stderr.write(text))
  const append = io.append ?? appendFileSync
  const fact = `${what} ${why}`
  if (stated.has(fact)) return false
  stated.add(fact)

  write(`::warning::unverified — ${what}. ${why}\n`)

  const summary = env.GITHUB_STEP_SUMMARY
  if (summary) {
    const heading = headed ? '' : '### Unverified\n\n'
    headed = true
    append(summary, `${heading}- **${what}** — ${why}\n`)
  }
  return true
}

/** Forget what has been said. For a test, which runs many cases in one process. */
export function forgetUnverified() {
  stated.clear()
  headed = false
}
