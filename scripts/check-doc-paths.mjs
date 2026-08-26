#!/usr/bin/env node
/**
 * Does every repository path the plugin surface names still exist?
 *
 * `skills/`, `references/`, `agents/` and `hooks/` are what an installed
 * `sb:map` / `sb:audit` / `sb:slice` / `sb:whatif` reads at runtime. When one
 * of those documents writes `` `src/styles/tokens.css` `` the agent does not
 * treat it as illustration — it opens the file, and a rename three months ago
 * turns a routing instruction into a dead end the agent has to recover from
 * mid-run. Same class as check-write-surface / check-read-surface, one level
 * out: a document asserting an interface the tree does not have.
 *
 *   node scripts/check-doc-paths.mjs
 *
 * The three that motivated it, all landed by ordinary refactors that never
 * looked at the prose:
 *
 *   - `src/lib/mutations/{authoringRpc,sliceMutations,findingMutations}.ts`
 *     in references/adapter-contract.md — that directory has never existed;
 *     two of the three files live flat under `src/lib/`, the third is the
 *     `findings.recordFindings` port on the backend adapters.
 *   - `src/styles/tokens.css` in references/customization.md — the styles
 *     were split into a dozen files, and the BRAND SEAM an adopter is being
 *     sent to edit moved to `src/styles/themes/light.css`.
 *   - `scripts/generate_scale_fixture.mjs` in references/data-model.md —
 *     renamed to `generate_sample_blueprint.mjs`.
 *
 * ── How a token is resolved ───────────────────────────────────────────────
 *
 * Backticked tokens and relative markdown link targets that end in a source
 * or document extension. A token passes on the FIRST of:
 *
 *   1. it exists at the repository root;
 *   2. it exists relative to the document that names it;
 *   3. it is a segment-aligned SUFFIX of a tracked path. This is what lets
 *      prose name `adapters/fixture.ts` or a bare `validate_ir.py` without
 *      spelling the whole path every time — the docs do this constantly and
 *      the reader resolves it fine. A suffix that matches nothing is the
 *      failure this check is for;
 *   4. it is in WORKSPACE_ARTIFACTS below.
 *
 * `*` is honoured at every step, because the roster genuinely is a glob
 * (`skills/audit/references/check-*.md`).
 *
 * WORKSPACE_ARTIFACTS fails CLOSED, the way check-read-surface's NOT_TOOLS
 * does: a file that legitimately cannot exist here is a one-line admission
 * with a reason, not a hole the next stale path slips through.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** The documents an installed plugin reads. */
const SURFACE = ['skills/', 'references/', 'agents/', 'hooks/']

/** Extensions that make a backticked token a claim about a file. */
const EXTENSIONS =
  'md|json|py|mjs|cjs|js|ts|tsx|sql|sh|css|html|yaml|yml|toml'

/**
 * Paths named by the plugin surface that are created in an ADOPTER's
 * workspace at run time and are therefore never tracked here. Each line is a
 * claim that the file's absence is correct — keep it short, and keep the
 * reason attached.
 */
const WORKSPACE_ARTIFACTS = new Map([
  ['blueprint-workspace.json', 'per-workspace state file, written by sb:map'],
  ['blueprint/*.json', 'the adopter\'s IR, authored in their workspace'],
  ['HANDOFF.md', 'generated per workspace from assets/HANDOFF.md.template'],
  ['audit/findings-report.json', 'the no-DB findings ledger, written per run'],
  ['export-all.json', 'the whole-blueprint audit export, written at dispatch'],
  ['sweep_orphans.py', 'declared planned in whatif-playbook §4, with a skip'],
])

/** Every tracked path, once. */
export function trackedPaths() {
  return execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
}

/** The documents under SURFACE. */
export function surfaceDocs(tracked) {
  return tracked.filter(
    (path) => path.endsWith('.md') && SURFACE.some((dir) => path.startsWith(dir)),
  )
}

/** A `*` glob as a whole-string regexp; a plain token as itself. */
function asPattern(token) {
  const escaped = token.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
  return new RegExp(`^${escaped}$`)
}

function matchesSomePath(pattern, tracked) {
  return tracked.some((path) => pattern.test(path))
}

/**
 * Every file-shaped token a document claims, with its line number.
 * Backticked tokens, plus relative markdown link targets.
 */
export function claimedPaths(source) {
  const backticked = new RegExp(`\`([A-Za-z0-9_./*-]+\\.(?:${EXTENSIONS}))\``, 'g')
  const linked = new RegExp(`\\]\\(([A-Za-z0-9_./*-]+\\.(?:${EXTENSIONS}))[)#]`, 'g')
  const claims = []
  source.split('\n').forEach((line, index) => {
    for (const regexp of [backticked, linked]) {
      regexp.lastIndex = 0
      for (const [, token] of line.matchAll(regexp)) {
        claims.push({ token, line: index + 1 })
      }
    }
  })
  return claims
}

/** Does `token`, as named by a document in `docDir`, resolve to something? */
export function resolves(token, docDir, tracked) {
  if (WORKSPACE_ARTIFACTS.has(token)) return true

  const bare = token.replace(/^\//, '')
  const candidates = [bare, normalize(join(docDir, bare))]

  for (const candidate of candidates) {
    if (!candidate.includes('*') && existsSync(join(REPO_ROOT, candidate))) return true
  }

  // Segment-aligned suffix of a tracked path — how the docs actually write.
  const suffix = asPattern(bare)
  const anywhere = new RegExp(suffix.source.replace(/^\^/, '^(?:.*/)?'))
  if (matchesSomePath(anywhere, tracked)) return true
  for (const candidate of candidates) {
    if (matchesSomePath(asPattern(candidate), tracked)) return true
  }
  return false
}

function main() {
  const tracked = trackedPaths()
  const failures = []

  for (const doc of surfaceDocs(tracked)) {
    const docDir = dirname(doc)
    const source = readFileSync(join(REPO_ROOT, doc), 'utf8')
    for (const { token, line } of claimedPaths(source)) {
      if (!resolves(token, docDir, tracked)) failures.push({ doc, line, token })
    }
  }

  if (failures.length > 0) {
    console.error(
      `${failures.length} path${failures.length === 1 ? '' : 's'} named by the plugin surface that nothing in the tree matches:\n`,
    )
    for (const { doc, line, token } of failures) {
      console.error(`  ${doc}:${line}  ${token}`)
    }
    console.error(
      '\nFix the document to name the file that exists, or — if the path is an' +
        '\nartifact of an adopter workspace rather than of this repository — add it' +
        '\nto WORKSPACE_ARTIFACTS in scripts/check-doc-paths.mjs with its reason.' +
        '\n\n  npm run check:doc-paths\n',
    )
    process.exitCode = 1
    return
  }

  const docs = surfaceDocs(tracked).length
  console.log(`check-doc-paths: every path named by ${docs} plugin-surface documents resolves.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
