/**
 * ONE MODULE ANSWERS "SO WHAT DID THE CHECK FIND".
 *
 * `sweep.mjs` is the first half of every check in this repository: a check
 * names a Subject and receives its files, and nothing in it resolves a root,
 * walks a directory, or decides what a missing folder means. This module is
 * the second half. Every check used to end the same way and disagree about
 * how: a guard deciding whether it was the command, a rule about what an
 * empty subject means, a summary line, and an exit — `process.exit(1)` in
 * seventeen of them and `process.exitCode` in seven, which are not the same
 * thing. `process.exit` abandons whatever the runtime has buffered, so a
 * check that printed a long report and then exited could lose the end of it;
 * `exitCode` lets the process finish saying what it found. Thirteen headers
 * said "same shape as" and named a sibling, which is a comment whose whole
 * content is that the code below it is a copy.
 *
 * A CHECK IS NOW A JUDGEMENT AND A SHELL. The judgement is a function: it
 * sweeps, it reads, it decides, and it returns what it found and how much it
 * looked at. It touches no exit code and prints nothing, so a test hands it a
 * throwaway tree and reads the findings back without starting a process. The
 * shell is `whenRun(import.meta.url, judgement)` — one line.
 *
 * WHAT A JUDGEMENT HANDS BACK. Four outcomes, and this module is the only
 * place any of them is decided:
 *
 *   CLEAN            Nothing found, and something was looked at. `line` — the
 *                    check's own summary, in its own words, naming what it
 *                    measured — goes to stdout and the exit code is untouched.
 *                    The words stay the check's because they are the part that
 *                    differs: a reader of one green line wants to know what
 *                    that check counted, not that some check passed.
 *   FINDINGS         `opening`, then one line per finding, then `closing`, all
 *                    on stderr, and the exit code goes to 1. Every report here
 *                    already had that shape — a sentence naming the class of
 *                    defect, the sites, and what to run — so it is the shape
 *                    the module takes rather than one it imposes.
 *   NO SUBJECT       `count` is zero: the check ran, found nothing wrong, and
 *                    measured nothing, which is the failure the sweep refuses
 *                    one level down and a filter inside a check can recreate.
 *                    It goes red, AND it goes through the `unverified`
 *                    register, because "measured nothing" is exactly the fact
 *                    that register exists to put where a person looks.
 *   UNVERIFIED       The check could not look at all — no database configured,
 *                    no tags fetched, no sibling checkout. Said through the
 *                    same register and NOT red: a correct skip that fails is a
 *                    guard whose readers learn to ignore it, which `sweep.mjs`
 *                    argues at length under `unverified`.
 *
 * The register is the sweep's, not a second one: a run that skipped a subject
 * and a run whose check could not reach one are the same fact to the person
 * reading the annotations, and they are counted together.
 *
 * WHAT THIS MODULE DOES NOT DECIDE is the wording. It renders; the check
 * writes. That line is what let every check in this repository move under it
 * without a single output byte changing, and it is the line to keep: a module
 * that started composing sentences would be a module that has to know what
 * each check is for.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { unverified } from './sweep.mjs'

/**
 * The verdict on one check: print it, and set the exit code.
 *
 * @param {{
 *   what?: string,
 *   count?: number,
 *   findings?: ReadonlyArray<string>,
 *   opening?: string,
 *   closing?: string,
 *   line?: string,
 *   unverified?: string,
 * }} judgement `what` names the thing the check examined, as the refusal and
 *   the register should say it — the subject, never the script. `count` is how
 *   many of them it examined. `findings` are the problems, each worded by the
 *   check. `opening` and `closing` frame them. `line` is the green summary.
 *   `unverified` is the reason the check could not look, and is the only field
 *   that matters when it is set.
 * @param {{
 *   out?: (text: string) => void,
 *   err?: (text: string) => void,
 *   fail?: (code: number) => void,
 *   io?: Parameters<typeof unverified>[2],
 * }} [sinks] Seams a test holds. By default the two consoles and this
 *   process's exit code.
 * @returns {'clean' | 'findings' | 'no subject' | 'unverified'}
 */
export function verdict(judgement = {}, sinks = {}) {
  const { what, count, findings = [], opening, closing, line } = judgement
  const out = sinks.out ?? ((text) => console.log(text))
  const err = sinks.err ?? ((text) => console.error(text))
  // Named for the outcome rather than for `process.exit`, which is the one call
  // this module exists to stop anybody making.
  const fail = sinks.fail ?? ((code) => (process.exitCode = code))

  // COULD NOT LOOK comes first, because every question below it presumes a
  // measurement that was never taken. It is green: the skips this reaches are
  // the correct ones, and the register is what stops them reading as a run
  // that verified something.
  if (judgement.unverified) {
    unverified(what ?? 'the subject', judgement.unverified, sinks.io)
    // A check may have a sentence of its own to add — which version went
    // untagged, which sibling was not there. The register names the subject and
    // what would reach it; the line names the particular. Both, in that order.
    if (line) out(line)
    return 'unverified'
  }

  if (findings.length > 0) {
    if (opening) err(opening)
    for (const finding of findings) err(finding)
    if (closing) err(closing)
    fail(1)
    return 'findings'
  }

  // A CLEAN RUN OVER NOTHING IS THE DEFECT THIS WHOLE SET EXISTS FOR. The
  // sweep refuses an empty subject where it lists the files; a check can empty
  // it again afterwards with one filter, one renamed folder, one read that
  // skipped every file — and what it prints then is the same green line, every
  // run after.
  if (count === 0) {
    unverified(
      what ?? 'the subject',
      'this check examined none of it, so its green line would report a clean run over ' +
        'nothing. Find out why there is nothing to measure before trusting the next one.',
      sinks.io,
    )
    fail(1)
    return 'no subject'
  }

  // A JUDGEMENT THAT REPORTS AND DOES NOT MEASURE IS THE DEFECT, ONE LEVEL UP
  // AGAIN. `count` is optional because the usage errors and the `--write` modes
  // below have nothing to count and nothing to say; a judgement with a green
  // line and no count is a check that forgot, and forgetting is how the green
  // line over nothing comes back.
  if (line && count === undefined) {
    throw new Error(
      `a verdict with a summary line and no count: ${what ?? 'this check'} would report a clean ` +
        'run without saying how much it examined, which is the state this module refuses',
    )
  }

  if (line) out(line)
  return 'clean'
}

/**
 * Whether this file is the command being run, rather than a module somebody
 * imported.
 *
 * Compared as resolved PATHS. A hand-built `file://` URL held against
 * `import.meta.url` silently no-ops on any path that needs escaping, so a
 * checkout under a directory with a space in its name would run the script and
 * have it do nothing, successfully — which is the failure mode this whole
 * guard set exists to refuse, arriving through the guard itself.
 *
 * @param {string | URL} url The caller's `import.meta.url`.
 * @returns {boolean}
 */
export function isTheCommand(url) {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(url)
}

/**
 * A check's whole command line: judge, then say the verdict.
 *
 * The judgement may be async — several of these stand a database up — and a
 * rejection is left to the runtime, which prints the stack and exits non-zero.
 * A throw here is a fact about the tree the check was pointed at rather than a
 * finding about its subject, and the two should not print alike.
 *
 * @param {string} url The caller's `import.meta.url`.
 * @param {() => object | Promise<object>} judge The check's judgement.
 */
export function whenRun(url, judge) {
  if (!isTheCommand(url)) return
  const said = judge()
  if (said && typeof said.then === 'function') said.then((judgement) => verdict(judgement))
  else verdict(said)
}
