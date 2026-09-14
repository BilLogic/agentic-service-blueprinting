/**
 * The Overlay, on fixture trees: the deployment's copy if it exists, else the
 * package's, path by path.
 *
 * The rule is stated on nothing but paths and a notion of "exists", so it is
 * posed here on a fixture set rather than a filesystem, and on a real
 * throwaway tree for the plugin — the part that has to agree with Vite's own
 * resolver about how a bare specifier is spelled.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { overlayPlugin, resolveOverlaid } from '../overlay.mjs'

const OVERLAY = '/deployment/src'
const PACKAGE = '/deployment/node_modules/agentic-service-blueprinting/src'
const LAYERS = [OVERLAY, PACKAGE]

/** A fixture: the files each layer holds, and "exists" read off it. */
function tree(files) {
  const held = new Set(files)
  return (candidate) => held.has(candidate)
}

test('a path the deployment holds resolves to the deployment’s copy', () => {
  const exists = tree([`${OVERLAY}/config.ts`, `${PACKAGE}/config.ts`])
  assert.deepEqual(resolveOverlaid('config.ts', LAYERS, exists), {
    path: `${OVERLAY}/config.ts`,
    layer: 0,
    found: true,
  })
})

test('a path the deployment does not hold resolves to the package’s', () => {
  const exists = tree([`${OVERLAY}/config.ts`, `${PACKAGE}/config.ts`, `${PACKAGE}/lib/x.ts`])
  assert.deepEqual(resolveOverlaid('lib/x.ts', LAYERS, exists), {
    path: `${PACKAGE}/lib/x.ts`,
    layer: 1,
    found: true,
  })
})

test('a nested resident shadows only its own path, not its directory', () => {
  // The all-or-nothing rule would have taken `lib/` as a whole. Per path, the
  // one file the deployment holds under `lib/agent/` is the deployment's and
  // its neighbour is still the package's.
  const exists = tree([
    `${OVERLAY}/lib/agent/role.md`,
    `${PACKAGE}/lib/agent/role.md`,
    `${PACKAGE}/lib/agent/loop.ts`,
  ])
  assert.equal(resolveOverlaid('lib/agent/role.md', LAYERS, exists).layer, 0)
  assert.equal(resolveOverlaid('lib/agent/loop.ts', LAYERS, exists).layer, 1)
})

test('a path neither layer holds is the package’s path, marked not found', () => {
  // So an absent module fails where the package's own error names it, rather
  // than under a deployment root that never had it.
  const exists = tree([])
  assert.deepEqual(resolveOverlaid('lib/missing.ts', LAYERS, exists), {
    path: `${PACKAGE}/lib/missing.ts`,
    layer: 1,
    found: false,
  })
})

test('a path that escapes the layers is refused', () => {
  const exists = tree([])
  assert.throws(() => resolveOverlaid('../package.json', LAYERS, exists), /not a path under the alias/)
  assert.throws(() => resolveOverlaid('/etc/passwd', LAYERS, exists), /not a path under the alias/)
  assert.throws(() => resolveOverlaid('x.ts', [PACKAGE], exists), /at least two layers/)
})

test('the module resolves by the package’s own name here, as it does out of node_modules there', () => {
  // `vite.config.ts` imports it by package name because that is the one
  // spelling that resolves on both sides. The deployment side is the
  // deployment-root suite's; this is the template side — self-reference
  // through `exports`, which is what makes the same bytes load here.
  const resolved = fileURLToPath(import.meta.resolve('agentic-service-blueprinting/overlay'))
  assert.equal(resolved, fileURLToPath(new URL('../overlay.mjs', import.meta.url)))
})

/**
 * The plugin, on a real tree, driven the way Vite drives it: the alias has
 * already rewritten `@/…` into the package's root, and the plugin is asked to
 * resolve that id.
 */
test('the plugin answers with the resident under any spelling, and stays silent otherwise', () => {
  const root = mkdtempSync(join(tmpdir(), 'overlay-'))
  try {
    const overlay = join(root, 'src')
    const packaged = join(root, 'node_modules', 'agentic-service-blueprinting', 'src')
    for (const dir of [join(overlay, 'lib'), join(packaged, 'lib')]) mkdirSync(dir, { recursive: true })
    writeFileSync(join(overlay, 'lib', 'resident.ts'), 'export const WHO = "resident"\n')
    writeFileSync(join(overlay, 'lib', 'role.md'), '# resident\n')
    writeFileSync(join(packaged, 'lib', 'resident.ts'), 'export const WHO = "package"\n')
    writeFileSync(join(packaged, 'lib', 'role.md'), '# package\n')
    writeFileSync(join(packaged, 'lib', 'onlyHere.ts'), 'export const WHO = "package"\n')
    // A resident that is a directory's index, beside the package's file.
    mkdirSync(join(overlay, 'lib', 'folder'))
    writeFileSync(join(overlay, 'lib', 'folder', 'index.ts'), 'export const WHO = "resident"\n')
    writeFileSync(join(packaged, 'lib', 'folder.ts'), 'export const WHO = "package"\n')

    const plugin = overlayPlugin({ layers: [overlay, packaged] })
    plugin.configResolved({ resolve: { extensions: ['.ts', '.tsx'] } })
    const resolve = (id) => plugin.resolveId.call({}, id)

    // Bare and with its extension, both spellings land on the resident.
    assert.equal(resolve(`${packaged}/lib/resident`), join(overlay, 'lib', 'resident.ts'))
    assert.equal(resolve(`${packaged}/lib/resident.ts`), join(overlay, 'lib', 'resident.ts'))
    // And a directory's index, the last spelling the resolver tries.
    assert.equal(resolve(`${packaged}/lib/folder`), join(overlay, 'lib', 'folder', 'index.ts'))
    // A query travels across untouched.
    assert.equal(resolve(`${packaged}/lib/role.md?raw`), `${join(overlay, 'lib', 'role.md')}?raw`)
    // The plugin cannot tell how an id was reached, and does not try: a
    // package module's own `./resident` arrives as this same absolute path
    // and is overlaid too, so a path is one module for every importer.
    assert.equal(
      resolve(join(packaged, 'lib', 'resident.ts')),
      join(overlay, 'lib', 'resident.ts'),
      'an id reached by a relative import inside the package is overlaid like any other',
    )
    // Nothing to overlay: the plugin says nothing and Vite resolves the package.
    assert.equal(resolve(`${packaged}/lib/onlyHere`), null)
    assert.equal(resolve(`${packaged}/lib/missing`), null)
    // An id outside the package root is not the plugin's to answer.
    assert.equal(resolve('/somewhere/else/lib/resident.ts'), null)
    assert.equal(resolve('react'), null)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
