/**
 * The sweep, on fixture trees: each subject's root rule, what "cannot see"
 * means there, and the two rules every subject shares — a file that vanished
 * between the listing and the read is skipped, and a walk that finds nothing
 * refuses.
 *
 * Every tree here is built in a temporary directory and removed after, so no
 * case reads this repository and none says anything about it; the run against
 * the real tree is every check that calls `sweep`.
 *
 * Run: npm test
 */
import { afterEach, test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { chooseDeployment } from '../seed-list.mjs'
import { SUBJECTS, forgetUnverified, sweep } from '../sweep.mjs'

const PACKAGE = 'node_modules/agentic-service-blueprinting'

/** A throwaway tree holding exactly the files named, each with the text given. */
function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'sweep-'))
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  return root
}

/** A sink that keeps a fixture's announcements out of this run's, and records them. */
function sinks() {
  const said = []
  return { said, io: { env: {}, write: (text) => said.push(text), append: () => {} } }
}

const scratches = []
afterEach(() => {
  for (const scratch of scratches.splice(0)) rmSync(scratch, { recursive: true, force: true })
  forgetUnverified()
})
const scratch = (files) => {
  const root = tree(files)
  scratches.push(root)
  return root
}

test('the subjects are the seven the plan named and the commit, and a name that is not one is refused', () => {
  assert.deepEqual(SUBJECTS, [
    'app',
    'docs',
    'scripts',
    'migrations',
    'references',
    'reference-docs',
    'deployment-seed',
    'commit',
  ])
  assert.throws(() => sweep({ subject: 'source', root: scratch({}) }), /not a subject: source/)
})

// ── app ────────────────────────────────────────────────────────────────────

test('the app is the overlay: a resident and the package’s files, one path each, the resident read', () => {
  const root = scratch({
    'src/lib/resident.ts': 'resident',
    'src/lib/nested/deep.ts': 'resident too',
    [`${PACKAGE}/src/lib/resident.ts`]: 'package',
    [`${PACKAGE}/src/lib/onlyPackage.ts`]: 'package',
    [`${PACKAGE}/src/App.tsx`]: 'package',
  })
  const app = sweep({ subject: 'app', root })
  assert.deepEqual(app.files, [
    'src/App.tsx',
    'src/lib/nested/deep.ts',
    'src/lib/onlyPackage.ts',
    'src/lib/resident.ts',
  ])
  // Paths hang off the package, so a finding reads `src/…` on either side.
  assert.equal(app.base, join(root, PACKAGE))
  assert.equal(app.read('src/lib/resident.ts'), 'resident')
  assert.equal(app.read('src/lib/onlyPackage.ts'), 'package')
  assert.equal(app.locate('src/lib/nested/deep.ts'), join(root, 'src/lib/nested/deep.ts'))
  assert.equal(app.locate('src/lib/onlyPackage.ts'), join(root, PACKAGE, 'src/lib/onlyPackage.ts'))
})

test('the app with one layer is that layer, whichever it is', () => {
  const own = scratch({ 'src/a.ts': 'a' })
  assert.deepEqual(sweep({ subject: 'app', root: own }).files, ['src/a.ts'])
  assert.equal(sweep({ subject: 'app', root: own }).base, own)

  const packaged = scratch({ [`${PACKAGE}/src/a.ts`]: 'a' })
  assert.deepEqual(sweep({ subject: 'app', root: packaged }).files, ['src/a.ts'])
  assert.equal(sweep({ subject: 'app', root: packaged }).base, join(packaged, PACKAGE))
})

test('no application anywhere is a failure that names both places it looked', () => {
  const root = scratch({ 'docs/a.md': '# a' })
  assert.throws(() => sweep({ subject: 'app', root }), /neither src nor node_modules\/agentic-service-blueprinting\/src/)
})

test('a path that is not under src/ is not the app’s to locate', () => {
  const root = scratch({ 'src/a.ts': 'a' })
  assert.throws(() => sweep({ subject: 'app', root }).locate('docs/a.md'), /does not start with src\//)
})

// ── docs ───────────────────────────────────────────────────────────────────

test('the docs are the root documents but the changelog, then the swept folders less the dated records', () => {
  const root = scratch({
    'README.md': '#',
    'CHANGELOG.md': '#',
    'AGENTS.md': '#',
    'docs/guide.md': '#',
    'docs/adr/0001-a.md': '#',
    'docs/engineering/checks.md': '#',
    'references/x.md': '#',
    'skills/s/SKILL.md': '#',
    'agents/a.md': '#',
    'docs/not-prose.txt': 'x',
  })
  const { said, io } = sinks()
  const docs = sweep({ subject: 'docs', root, io })
  assert.deepEqual(docs.files, [
    'AGENTS.md',
    'README.md',
    'agents/a.md',
    'docs/engineering/checks.md',
    'docs/guide.md',
    'references/x.md',
    'skills/s/SKILL.md',
  ])
  assert.equal(docs.seen, true)
  assert.deepEqual(said, [])
})

test('a swept folder the tree does not have is said out loud, once, and the rest is swept', () => {
  const root = scratch({ 'README.md': '#', 'docs/guide.md': '#' })
  const { said, io } = sinks()
  const docs = sweep({ subject: 'docs', root, io })
  assert.deepEqual(docs.files, ['README.md', 'docs/guide.md'])
  assert.equal(said.length, 1)
  assert.match(said[0], /unverified — the prose under references, skills, agents\./)
  // Said once per fact, however many checks sweep the same tree.
  sweep({ subject: 'docs', root, io })
  assert.equal(said.length, 1)
})

test('every swept folder missing is the root documents alone, announced, and not a refusal', () => {
  // The collapse the announcement exists for: a tree whose swept folders are
  // all absent — or all misspelt in the config — still has its root documents,
  // so the sweep hands those back and says what it could not see rather than
  // refusing over a tree that is not wrong.
  const root = scratch({ 'README.md': '#', 'src/a.ts': '' })
  const { said, io } = sinks()
  const docs = sweep({ subject: 'docs', root, io })
  assert.deepEqual(docs.files, ['README.md'])
  assert.equal(docs.seen, false)
  assert.match(said[0], /the prose under docs, references, skills, agents\./)
})

// ── scripts, migrations, references, reference-docs ────────────────────────

test('the scripts are this tree’s scripts/ and the scripts a skill ships, code only', () => {
  const root = scratch({
    'scripts/check-x.mjs': '',
    'scripts/tests/x.test.mjs': '',
    'scripts/notes.md': '',
    'skills/audit/scripts/audit_tools.py': '',
    'skills/audit/SKILL.md': '',
    [`${PACKAGE}/scripts/theirs.mjs`]: '',
  })
  assert.deepEqual(sweep({ subject: 'scripts', root }).files, [
    'scripts/check-x.mjs',
    'scripts/tests/x.test.mjs',
    'skills/audit/scripts/audit_tools.py',
  ])
  assert.throws(() => sweep({ subject: 'scripts', root: scratch({ 'src/a.ts': '' }) }), /no scripts\//)
})

test('the migrations are the .sql files of this tree’s series, and none is a failure', () => {
  const root = scratch({
    'supabase/migrations/2_b.sql': '',
    'supabase/migrations/1_a.sql': '',
    'supabase/migrations/README.md': '',
  })
  assert.deepEqual(sweep({ subject: 'migrations', root }).files, [
    'supabase/migrations/1_a.sql',
    'supabase/migrations/2_b.sql',
  ])
  assert.throws(() => sweep({ subject: 'migrations', root: scratch({ 'src/a.ts': '' }) }), /no supabase\/migrations/)
})

test('the references are this tree’s published surface, the skills’ own included, and a tree without one says so', () => {
  const root = scratch({
    'references/a.md': '',
    'references/ir-schema.json': '',
    'skills/audit/references/check-x.md': '',
    'skills/audit/SKILL.md': '',
    'skills/audit/scripts/tool.py': '',
  })
  assert.deepEqual(sweep({ subject: 'references', root }).files, [
    'references/a.md',
    'references/ir-schema.json',
    'skills/audit/references/check-x.md',
  ])
  const { said, io } = sinks()
  const none = sweep({ subject: 'references', root: scratch({ 'src/a.ts': '' }), io })
  assert.equal(none.seen, false)
  assert.deepEqual(none.files, [])
  assert.match(said[0], /the published reference surface/)
})

test('the reference documents are the package’s, out of the install where there is one', () => {
  const deployment = scratch({
    'references/mine.md': 'mine',
    [`${PACKAGE}/references/theirs.md`]: 'theirs',
    [`${PACKAGE}/references/schema.json`]: '{}',
  })
  const theirs = sweep({ subject: 'reference-docs', root: deployment })
  assert.deepEqual(theirs.files, ['references/theirs.md'])
  assert.equal(theirs.base, join(deployment, PACKAGE))
  assert.equal(theirs.read('references/theirs.md'), 'theirs')

  const template = scratch({ 'references/mine.md': 'mine' })
  assert.deepEqual(sweep({ subject: 'reference-docs', root: template }).files, ['references/mine.md'])
  assert.equal(sweep({ subject: 'reference-docs', root: template }).base, template)

  // An installed package that ships none is a failure — never the deployment's
  // own documents handed back as the package's.
  const bare = scratch({ 'references/mine.md': 'mine', [`${PACKAGE}/package.json`]: '{}' })
  assert.throws(
    () => sweep({ subject: 'reference-docs', root: bare }),
    /no references under .*node_modules\/agentic-service-blueprinting: this tree has no reference documents/,
  )
})

// ── deployment-seed ────────────────────────────────────────────────────────

test('the deployment seed is the one sibling that ships one and is not this package', () => {
  const parent = mkdtempSync(join(tmpdir(), 'sweep-siblings-'))
  scratches.push(parent)
  const write = (rel, text) => {
    mkdirSync(dirname(join(parent, rel)), { recursive: true })
    writeFileSync(join(parent, rel), text)
  }
  write('template/package.json', '{"name":"agentic-service-blueprinting"}')
  write('template/src/a.ts', '')
  write('clone/package.json', '{"name":"agentic-service-blueprinting"}')
  write('clone/supabase/seed.sql', '-- a second checkout of this package')
  write('deployment/package.json', '{"name":"a-deployment"}')
  write('deployment/supabase/seed.sql', '-- the deployment')
  write('notes/README.md', '')

  const seed = sweep({ subject: 'deployment-seed', root: join(parent, 'template') })
  assert.equal(seed.seen, true)
  assert.equal(seed.base, join(parent, 'deployment'))
  assert.deepEqual(seed.files, ['supabase/seed.sql'])
  assert.equal(seed.read('supabase/seed.sql'), '-- the deployment')

  // A deployment that states its seed as a list loads that list, in order.
  write('deployment/supabase/config.toml', '[db.seed]\nenabled = true\nsql_paths = ["seeds/2_b.sql", "seeds/1_a.sql"]\n')
  write('deployment/supabase/seeds/1_a.sql', '-- a')
  write('deployment/supabase/seeds/2_b.sql', '-- b')
  const listed = sweep({ subject: 'deployment-seed', root: join(parent, 'template') })
  assert.deepEqual(listed.files, ['supabase/seeds/2_b.sql', 'supabase/seeds/1_a.sql'])
  assert.equal(listed.read('supabase/seeds/1_a.sql'), '-- a')
})

test('no sibling, or several, is a skip said out loud with the reason', () => {
  const { said, io } = sinks()
  const alone = sweep({ subject: 'deployment-seed', root: scratch({ 'src/a.ts': '' }), io })
  assert.equal(alone.seen, false)
  assert.deepEqual(alone.files, [])
  assert.match(said[0], /no checkout beside this one ships a supabase\/seed\.sql/)

  const several = chooseDeployment(
    [
      { dir: '/x/a', name: 'a', hasSeed: true },
      { dir: '/x/b', name: 'b', hasSeed: true },
      { dir: '/x/self', name: 'me', hasSeed: true },
    ],
    'me',
  )
  assert.match(several.skip, /2 checkouts beside this one .*\(a, b\)/)
})

// ── commit ─────────────────────────────────────────────────────────────────

test('the commit is what git would carry: tracked, and untracked but not ignored', () => {
  const root = scratch({
    'README.md': '#',
    'src/a.ts': '',
    '.gitignore': 'ignored.txt\n',
    'ignored.txt': 'x',
  })
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['add', 'README.md'], { cwd: root })
  // README is tracked, src/a.ts and .gitignore are untracked and would be
  // carried, ignored.txt would not.
  const commit = sweep({ subject: 'commit', root })
  assert.deepEqual(commit.files, ['.gitignore', 'README.md', 'src/a.ts'])
  assert.equal(commit.read('README.md'), '#')
  assert.equal(commit.base, root)
})

test('a commit with nothing in it is a failure', () => {
  const root = scratch({ '.gitignore': '*\n' })
  execFileSync('git', ['init', '-q'], { cwd: root })
  assert.throws(() => sweep({ subject: 'commit', root }), /git lists no file under/)
})

// ── the shared rules ───────────────────────────────────────────────────────

test('a file that vanished between the listing and the read is null; any other failure throws', () => {
  const root = scratch({ 'src/gone.ts': 'x', 'src/dir/kept.ts': 'y' })
  const app = sweep({ subject: 'app', root })
  assert.deepEqual(app.files, ['src/dir/kept.ts', 'src/gone.ts'])
  rmSync(join(root, 'src/gone.ts'))
  assert.equal(app.read('src/gone.ts'), null)
  // A directory where a file belongs is not a vanishing.
  assert.throws(() => app.read('src/dir'), /EISDIR/)
  if (process.getuid && process.getuid() !== 0) {
    chmodSync(join(root, 'src/dir/kept.ts'), 0o000)
    try {
      assert.throws(() => app.read('src/dir/kept.ts'), /EACCES/)
    } finally {
      chmodSync(join(root, 'src/dir/kept.ts'), 0o644)
    }
  }
})

test('a filter narrows the files, and a filter that leaves nothing is a failure naming what was wanted', () => {
  const root = scratch({ 'src/a.ts': '', 'src/a.test.ts': '', 'src/b.md': '' })
  const code = sweep({ subject: 'app', root, where: (path) => /\.ts$/.test(path) && !/\.test\.ts$/.test(path) })
  assert.deepEqual(code.files, ['src/a.ts'])
  assert.throws(
    () => sweep({ subject: 'app', root, where: (path) => path.endsWith('.py'), what: 'python module' }),
    /no python module under .*: this walk has no subject, which is a failure and not a pass/,
  )
})
