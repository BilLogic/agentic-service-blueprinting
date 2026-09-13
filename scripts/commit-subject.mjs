/**
 * WHAT A COMMIT WOULD CARRY. The subject both content sweeps read, described
 * once so the next reader does not have to diff two `isScanned` functions to
 * find where they part.
 *
 * `check-standalone.mjs` reads those files for the WORDS that name the
 * deployment this template was generalised from. `check-content-coupling.mjs`
 * reads the same files for that deployment's CONTENT — an id, a cast, a
 * scenario, an asset path — which names nothing and walks past a grep. Two
 * questions, one subject, and the subject is this: every file git would carry
 * in a commit, which is the tracked files together with the untracked ones
 * git would not ignore.
 *
 * TRACKED ALONE WAS A TRAP (#180, #181): a changeset written and checked
 * locally before `git add` was invisible to the script and failed CI the
 * moment it was committed. One listing, one predicate, and the predicate sees
 * what a commit would.
 *
 * WHAT EACH SWEEP NARROWS, AND WHY THE TWO DIFFER. A sweep passes its own
 * `isScanned` here, because the two have genuinely different reasons to look
 * away and each states its own beside its list:
 *
 *   - BINARY payloads. Both skip them; the two spellings differ by `svg`,
 *     which the word-grep reads on purpose (`unowned` in an icon was one of
 *     the eighteen) and which carries no id, cast or asset path.
 *   - FIXTURES. Only the content sweep skips them. A test has to be able to
 *     write down the value the code under test receives, and the content
 *     sweep's own tests have to be able to plant one; a word the word-grep
 *     forbids has no such excuse, and its fixtures are named file by file.
 *   - FILES THAT MUST CARRY THE VALUE to do their job, named one at a time
 *     with the reason attached.
 *
 * Neither narrows by DIRECTORY any more. The content sweep used to, over a
 * seven-root list no root-level file could match, so `AGENTS.md` — the
 * always-loaded tier, the one file every session is handed without choosing —
 * was outside its subject along with every other root document, and a foreign
 * cell id appended to it passed in green.
 */
import { execFileSync } from 'node:child_process'

/**
 * Every file a commit would carry under `root`, narrowed by `isScanned`.
 *
 * AN EMPTY SWEEP IS A FAILURE. Two steps stand between `git ls-files` and
 * this result — the listing itself, and a predicate that can reject every
 * path it returns — and either of them coming back with nothing produces the
 * same green line the full sweep produces, with a `0` in it that nobody reads
 * as a defect. The refusal lives here rather than in each caller because the
 * subject is the same one in all of them.
 *
 * @param {string} root
 * @param {(path: string) => boolean} isScanned
 * @returns {string[]}
 */
export function commitFiles(root, isScanned) {
  const listed = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  const seen = new Set()
  const found = listed.split('\0').filter((path) => {
    if (path === '' || seen.has(path) || !isScanned(path)) return false
    seen.add(path)
    return true
  })
  if (found.length === 0) {
    throw new Error(
      `no scanned file under ${root}: git listed ${listed.split('\0').filter(Boolean).length} ` +
        `path(s) and none of them is in this sweep's subject, which is a failure and not a pass`,
    )
  }
  return found
}
