#!/usr/bin/env node
/**
 * Every path a deployment imports from this repo still exists here.
 *
 * The deployment this template was generalised from installs it as a git-URL
 * dependency pinned to a tag, and imports twenty-two of its documents BY
 * FIXED PATH, at build time, through Vite's `?raw`:
 *
 *   import laneRoles from '<this package>/references/lane-roles.md?raw'
 *
 * Those paths are a published interface — see
 * docs/adr/0004-reference-paths-are-a-published-interface.md. Moving one is a
 * version bump plus a matching import change over there, never a silent move.
 * Nothing on this side noticed until this check: `check:manifest` diffs
 * `identifiers.json`, so a reviewer CAN see a rename, but a diff is a
 * question, not a failure; `check:doc-paths` holds this repo's own documents
 * to paths inside this tree, the same assertion pointed the other way.
 * Neither knows which of these files somebody else opens by name. A move
 * landed green here and was discovered at the consumer's build, which is
 * late — and the predecessor of the package pin, a file-sync between the two
 * repos, was deleted for exactly this class of failure: it inverted, and
 * reverted a rename across eighteen files.
 *
 *   node scripts/check-reference-paths.mjs
 *
 * A path has to be BOTH tracked and present on disk. Tracked alone is the
 * index, which still holds the old name after a bare `mv`; present alone is a
 * file a git-URL install would never ship, because the consumer installs a
 * git tree, not a working directory.
 *
 * Renaming one of these is not forbidden — it is a release. Move the file,
 * update this list, bump the version, and land the matching import change in
 * the consumer before the tag it pins moves. Deleting a line here because the
 * check went red, without that consumer change, converts a break in this
 * repo now into a break in the consumer at its next upgrade.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/**
 * The paths the deployment imports from this repo, verbatim, minus the
 * package-name prefix its specifiers carry. Eighteen references and the four
 * `SKILL.md` bodies.
 *
 * Where the list comes from — re-derive it in a checkout of the deployment,
 * substituting this package's name:
 *
 *   grep -rhoE "<this package>/(references|skills)/[A-Za-z0-9._/-]+" \
 *     . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs \
 *     | sed 's/?raw//' | sort -u
 *
 * Its agent's read tool names most of them, its skill loader the four skills,
 * and its own write-surface guard the canvas adapter, which it reads out of
 * `node_modules/`. A change on the consumer's side — a new import, or one it
 * stops making — must update this list in the same pull request: a list that
 * has drifted from the consumer's imports guards paths nobody reads and
 * misses the ones they do.
 */
export const CONSUMER_IMPORTS = [
  // Read by the canvas agent's `get_reference` tool, and — for the canvas
  // adapter — by the deployment's own write-surface guard.
  'references/audit-playbook.md',
  'references/canvas-adapter.md',
  'references/data-model.md',
  'references/lane-roles.md',
  'references/lane-vocabulary.md',

  // The four skill bodies the deployment's agent loads as its procedures.
  'skills/audit/SKILL.md',
  'skills/map/SKILL.md',
  'skills/slice/SKILL.md',
  'skills/whatif/SKILL.md',

  // The audit roster: one document per check, each opened by name.
  'skills/audit/references/check-channel-conflict.md',
  'skills/audit/references/check-fee-visibility.md',
  'skills/audit/references/check-gap-sweep.md',
  'skills/audit/references/check-jargon-lint.md',
  'skills/audit/references/check-kpi-alignment.md',
  'skills/audit/references/check-obsolete-source.md',
  'skills/audit/references/check-perceived-owner.md',
  'skills/audit/references/check-value-ledger.md',

  // The playbooks the three other skills reach for.
  'skills/map/references/cocreate-playbook.md',
  'skills/map/references/elicitation-protocol.md',
  'skills/slice/references/slice-playbook.md',
  'skills/slice/references/slice-templates.md',
  'skills/whatif/references/whatif-playbook.md',
]

/** The two roots this interface covers. A path outside them is a mistake. */
const INTERFACE_ROOTS = ['references/', 'skills/']

/** Every tracked path, once. */
export function trackedPaths() {
  return execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
}

/**
 * The imported paths that are not there, each with what is wrong with it.
 * `tracked` is a Set; `onDisk` answers whether a repo-relative path exists.
 */
export function absences(paths, tracked, onDisk) {
  const out = []
  for (const path of paths) {
    if (!INTERFACE_ROOTS.some((root) => path.startsWith(root))) {
      out.push({ path, reason: 'not under references/ or skills/' })
      continue
    }
    if (!onDisk(path)) {
      out.push({ path, reason: 'no file at this path' })
      continue
    }
    if (!tracked.has(path)) {
      out.push({ path, reason: 'untracked — a git install would not ship it' })
    }
  }
  return out
}

function main() {
  const tracked = new Set(trackedPaths())
  const missing = absences(CONSUMER_IMPORTS, tracked, (path) =>
    existsSync(join(REPO_ROOT, path)),
  )

  if (missing.length > 0) {
    console.error(
      `${missing.length} path${missing.length === 1 ? '' : 's'} the deployment imports by fixed name that this tree no longer has:\n`,
    )
    for (const { path, reason } of missing) {
      console.error(`  ${path} — ${reason}`)
    }
    console.error(
      '\nThese paths are a published interface:' +
        '\ndocs/adr/0004-reference-paths-are-a-published-interface.md.' +
        '\nEither put the file back at the path the consumer imports, or make the move a' +
        '\nrelease — update CONSUMER_IMPORTS in scripts/check-reference-paths.mjs, bump the' +
        '\nversion, and land the matching import change in the consumer before the tag it' +
        '\npins moves.' +
        '\n\n  npm run check:reference-paths\n',
    )
    process.exitCode = 1
    return
  }

  console.log(
    `check-reference-paths: all ${CONSUMER_IMPORTS.length} paths the deployment imports still exist.`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
