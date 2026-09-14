/**
 * THE COMPOSITION-CLAIM CHECK, DRIVEN FROM BOTH SIDES OF THE SEAM.
 *
 * The check's whole value is that it FAILS — a surface nobody documented has
 * to turn a build red. So the interesting cases are not "the tree is clean
 * today"; they are that an unclaimed file and a stale claim each fail and name
 * what is wrong, and that the side of the seam a file lives on decides which
 * repository has to write the claim.
 *
 * The committed tree is still driven the way a workflow drives it, by running
 * the script, because the exit code is the contract every caller reads. Every
 * other case is driven against throwaway repositories — the shape
 * `the-router-is-a-router.test.mjs` uses — and they must be. The version this
 * replaces planted a real component file inside the tree and deleted it a
 * moment later, which made it a writer into the tree other suites read: the
 * runner runs suites in parallel, about ten of them walk the application, and
 * for the few hundred milliseconds the probe existed one could sample a file
 * that was gone by the time it asserted, or die on ENOENT re-reading it.
 *
 * So the rule this file keeps for itself: a test may not write into the tree
 * another suite reads. Do not move these cases back onto the real tree.
 *
 * The fixtures name their composition folder `composition-fixture`, which is
 * no address in either repository — the folder a real one uses is a value in
 * `repo-config.mjs`, and a test that spelled it here would be asserting one
 * repository's choice in a file both of them run.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { APP_PACKAGE } from '../sweep.mjs'
import { ASSEMBLED, compositionLayers, frontmatter, resolveDocuments, sweepClaims } from '../check-harness-claims.mjs'

const ROOT = resolve(new URL('../..', import.meta.url).pathname)
const SCRIPT = join(ROOT, 'scripts/check-harness-claims.mjs')

/** The composition folder the fixtures use, in both trees. */
const DOCUMENTS = 'composition-fixture'

/** A deployment: the package installed under it, and its own tree beside it. */
const composition = (claimed = []) => ({ documents: DOCUMENTS, claimed })

/** Where a fixture plants a file the application ships: inside the package. */
const packaged = (path) => `node_modules/${APP_PACKAGE}/${path}`

/** A composition document claiming the files it names. */
function claiming(...claims) {
  const list = claims.map((claim) => `  - ${claim}\n`).join('')
  return `---\nsummary: a throwaway composition document\nclaims:\n${list}---\n`
}

/**
 * A throwaway repository holding exactly the files the case names.
 *
 * Every fixture is a DEPLOYMENT — the application inside the package, the
 * package's documents beside it — because that is the shape the seam only
 * exists in. This repository's own shape is the one case the committed tree
 * already proves, by running the script.
 */
function repo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'harness-claims-'))
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  // A checkout, because the check asks the `commit` subject what a repository's
  // OWN assembled trees hold — which is how a build cache or an ignored folder
  // inside one of those trees stays out of the source set. An init is enough:
  // the listing is tracked plus untracked-and-not-ignored.
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: 'ignore' })
  return { root, done: () => rmSync(root, { recursive: true, force: true }) }
}

/** The package's own document, claiming what the package ships. */
const upstream = (name, ...claims) => ({
  [packaged(`${DOCUMENTS}/${name}`)]: claiming(...claims),
})

test('every assembled file in this tree is claimed by exactly one composition document', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`)
})

test('the assembled directories are the four the application composes', () => {
  assert.deepEqual(ASSEMBLED, [
    'src/components/blueprint',
    'src/components/editor',
    'src/components/cover',
    'src/components/mobile',
  ])
})

test('a file the package claims needs no claim in the deployment', () => {
  // The pin bump that used to go red: the package ships a module and claims
  // it, the deployment writes nothing, and the check is green there.
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    [packaged('src/components/cover/CoverFigure.tsx')]: 'export const figure = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx', 'src/components/cover/CoverFigure.tsx'),
  })
  try {
    assert.deepEqual(sweepClaims({ root, composition: composition() }).problems, [])
  } finally {
    done()
  }
})

test('a file the package ships and no document claims fails, and is named', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    [packaged('src/components/cover/Unclaimed.tsx')]: 'export const stray = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
  })
  try {
    const { problems } = sweepClaims({ root, composition: composition() })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /Unclaimed\.tsx/, 'the failure must name the file')
    assert.match(problems[0], /claimed by no composition document/)
  } finally {
    done()
  }
})

test("a file the deployment adds under its own tree still needs a claim there", () => {
  const files = {
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
    'deployment/components/TenantBanner.tsx': 'export const banner = null\n',
  }
  const { root, done } = repo(files)
  try {
    const { problems } = sweepClaims({ root, composition: composition(['deployment']) })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /deployment\/components\/TenantBanner\.tsx/)
    assert.match(problems[0], /claimed by no composition document/)
  } finally {
    done()
  }

  // And the deployment's own document is where that claim goes.
  const claimed = repo({
    ...files,
    [`${DOCUMENTS}/tenant-banner.md`]: claiming('deployment/components/TenantBanner.tsx'),
  })
  try {
    assert.deepEqual(
      sweepClaims({ root: claimed.root, composition: composition(['deployment']) }).problems,
      [],
    )
  } finally {
    claimed.done()
  }
})

test("a deployment's document of the same name replaces the package's", () => {
  // The prose override: one name, the deployment's copy answering, and the
  // package's claims for that surface are the deployment's to carry.
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
    [`${DOCUMENTS}/cover-page.md`]: claiming('src/components/cover/CoverPage.tsx'),
  })
  try {
    const { problems, docs } = sweepClaims({ root, composition: composition() })
    // Not "claimed twice": the deployment's document REPLACED the package's,
    // so there is one document of that name and one claim on that file.
    assert.deepEqual(problems, [])
    assert.deepEqual(docs, [`${DOCUMENTS}/cover-page.md`])
  } finally {
    done()
  }
})

test('a claim on a file that is no longer there fails, and names both', () => {
  const ghost = 'src/components/editor/NoSuchSurface.tsx'
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
    [`${DOCUMENTS}/canvas.md`]: claiming(ghost),
  })
  try {
    const { problems } = sweepClaims({ root, composition: composition() })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /NoSuchSurface\.tsx/, 'the failure must name the missing file')
    assert.match(problems[0], /canvas\.md/, 'the failure must name the document that claims it')
  } finally {
    done()
  }
})

test('a file two documents claim fails, and names both documents', () => {
  const shared = 'src/components/cover/CoverPage.tsx'
  const { root, done } = repo({
    [packaged(shared)]: 'export const page = null\n',
    ...upstream('cover-page.md', shared),
    [`${DOCUMENTS}/sidebar.md`]: claiming(shared),
  })
  try {
    const { problems } = sweepClaims({ root, composition: composition() })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /cover-page\.md/, 'the failure must name the first document')
    assert.match(problems[0], /sidebar\.md/, 'the failure must name the second document')
    assert.match(problems[0], new RegExp(APP_PACKAGE), "and say which side of the seam it is on")
  } finally {
    done()
  }
})

test('a co-located test file needs no claim', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    [packaged('src/components/cover/coverPage.test.tsx')]: 'export const probe = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
  })
  try {
    assert.deepEqual(sweepClaims({ root, composition: composition() }).problems, [])
  } finally {
    done()
  }
})

test('a claimed tree this repository does not have is a failure, not a pass', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
  })
  try {
    const { problems } = sweepClaims({ root, composition: composition(['deploymnet']) })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /deploymnet/, 'the failure must name the misspelt tree')
  } finally {
    done()
  }
})

test('a composition document that claims nothing fails, and the survey does not', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
    [packaged(`${DOCUMENTS}/overview.md`)]: '---\nsummary: the survey\n---\n',
    [`${DOCUMENTS}/silent.md`]: '---\nsummary: claims nothing\n---\n',
  })
  try {
    const { problems } = sweepClaims({ root, composition: composition() })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /silent\.md/)
    assert.match(problems[0], /declares no `claims:` list/)
  } finally {
    done()
  }
})

test('the layers are this tree first and the package second, each only if it is there', () => {
  const { root, done } = repo({
    [`${DOCUMENTS}/own.md`]: claiming('a'),
    [packaged(`${DOCUMENTS}/upstream.md`)]: claiming('b'),
  })
  try {
    const layers = compositionLayers(root, DOCUMENTS)
    assert.equal(layers.length, 2)
    assert.equal(layers[0].packaged, false)
    assert.equal(layers[1].packaged, true)
    assert.match(layers[0].path, new RegExp(`${DOCUMENTS}$`))
    assert.match(layers[1].path, new RegExp(`${APP_PACKAGE}/${DOCUMENTS}$`))
    const names = resolveDocuments(layers, DOCUMENTS).map((doc) => doc.label)
    assert.deepEqual(names, [`${DOCUMENTS}/own.md`, `${APP_PACKAGE}/${DOCUMENTS}/upstream.md`])
  } finally {
    done()
  }
})

test('frontmatter reads the one block list this check needs, and the scalars beside it', () => {
  const fm = frontmatter('---\nsummary: one line\nclaims:\n  - a/b.tsx\n  - a/c.tsx\nlast-reviewed: 2026-09-14\n---\nbody\n')
  assert.equal(fm.summary, 'one line')
  assert.deepEqual(fm.claims, ['a/b.tsx', 'a/c.tsx'])
  assert.equal(fm['last-reviewed'], '2026-09-14')
  assert.deepEqual(frontmatter('no frontmatter here\n'), {})
})

test('a repository that states no `composition` is told what to state', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
  })
  try {
    // Nothing at all, and the half that names a folder but no trees: both are
    // a repository that installed the check rather than adopting it.
    assert.throws(() => sweepClaims({ root, composition: null }), /states no usable `composition`/)
    assert.throws(
      () => sweepClaims({ root, composition: { claimed: [] } }),
      /states no usable `composition`/,
    )
  } finally {
    done()
  }
})

test('an installed package with no composition folder says so once, not two hundred times', () => {
  // The folder name addresses both layers, so a deployment that named its own
  // something else would otherwise hear that every file the package ships is
  // unclaimed. The cause is reported instead.
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    [`${DOCUMENTS}/cover-page.md`]: claiming('src/components/cover/CoverPage.tsx'),
  })
  try {
    const { problems } = sweepClaims({ root, composition: { documents: 'elsewhere', claimed: [] } })
    assert.ok(
      problems.some((problem) => /is installed and holds no elsewhere/.test(problem)),
      problems.join('\n'),
    )
  } finally {
    done()
  }
})

test('a document the package ships claims only what the package ships', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    'deployment/components/TenantBanner.tsx': 'export const banner = null\n',
    ...upstream(
      'cover-page.md',
      'src/components/cover/CoverPage.tsx',
      'deployment/components/TenantBanner.tsx',
    ),
  })
  try {
    const { problems } = sweepClaims({ root, composition: composition() })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /deployment\/components\/TenantBanner\.tsx/)
    assert.match(problems[0], /not an application path/)
  } finally {
    done()
  }
})

test('an ignored folder inside a claimed tree is not a file anyone documents', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx'),
    'deployment/components/TenantBanner.tsx': 'export const banner = null\n',
    'deployment/components/dist/bundle.js': 'built\n',
    '.gitignore': 'dist/\n',
    [`${DOCUMENTS}/tenant-banner.md`]: claiming('deployment/components/TenantBanner.tsx'),
  })
  try {
    assert.deepEqual(sweepClaims({ root, composition: composition(['deployment']) }).problems, [])
  } finally {
    done()
  }
})

test('a claim on a directory is no claim at all', () => {
  const { root, done } = repo({
    [packaged('src/components/cover/CoverPage.tsx')]: 'export const page = null\n',
    ...upstream('cover-page.md', 'src/components/cover/CoverPage.tsx', 'src/components/editor'),
  })
  try {
    const { problems } = sweepClaims({ root, composition: composition() })
    assert.equal(problems.length, 1, problems.join('\n'))
    assert.match(problems[0], /src\/components\/editor/)
    assert.match(problems[0], /is no file/)
  } finally {
    done()
  }
})
