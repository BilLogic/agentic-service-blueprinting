#!/usr/bin/env node
/**
 * The identifier manifest, and the two questions it exists to answer.
 *
 * First: is the committed manifest still true of the tree? A stale manifest is
 * worse than none — it reports a contract that is no longer the contract.
 *
 * Second: does every name the canvas agent will accept resolve to a file that
 * exists? That is the exact shape of the bug this repo already shipped: a
 * reference renamed on disk, the pointer left behind, no compile error, and a
 * runtime `get_reference` that answers "unknown reference".
 *
 * THE TREE IS WALKED ONCE, in the first test, which is the one that has to
 * walk it: byte-identity between the committed manifest and a manifest
 * generated now IS the question. Everything after it reads the committed file
 * — proved current by that first test — so the pointer questions are asked of
 * the names a consumer actually gets, and no test here walks the tree a second
 * time to ask them. The walk itself is the sweep's, tested in the sweep's own
 * suite; the judgements this script makes over what comes back — a name
 * claimed twice, a name declared in frontmatter — are handed their entries.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  buildManifest,
  collisions,
  frontmatterName,
  MANIFEST_PATH,
} from '../generate-identifier-manifest.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** The committed contract, which the test below holds to the tree. */
const committed = () => JSON.parse(readFileSync(join(ROOT, MANIFEST_PATH), 'utf8'))

test('the committed manifest matches the tree', () => {
  const current = readFileSync(join(ROOT, MANIFEST_PATH), 'utf8')
  const generated = `${JSON.stringify(buildManifest(ROOT), null, 2)}\n`
  assert.equal(
    current,
    generated,
    'identifiers.json is stale — run `npm run manifest`',
  )
})

test('every listed identifier points at a file that exists', () => {
  const manifest = committed()
  const entries = [
    ...manifest.skills,
    ...manifest.references,
    ...manifest.schemas,
    ...manifest.agents,
  ]
  for (const { name, path } of entries) {
    assert.ok(existsSync(join(ROOT, path)), `${name} points at missing ${path}`)
  }
})

test('every name the canvas agent accepts resolves to a reference doc', () => {
  const manifest = committed()
  const known = new Set(manifest.references.map((entry) => entry.name))
  const missing = manifest.canvasReferenceNames.filter((name) => !known.has(name))
  assert.deepEqual(missing, [], 'referenceNames.ts names a doc that is not on disk')
})

test('every hook names a script that exists', () => {
  for (const { event, script } of committed().hooks) {
    assert.ok(script, `${event} hook has no resolvable script`)
    assert.ok(
      existsSync(join(ROOT, 'hooks', script)),
      `${event} runs missing hooks/${script}`,
    )
  }
})

test('a name claimed by two files is a collision, not a diff', () => {
  // get_reference takes a bare name, so two files called `data-model.md` in
  // different directories make the walk order the contract.
  assert.deepEqual(collisions([{ name: 'a', path: 'one/a.md' }]), [])
  assert.deepEqual(
    collisions([
      { name: 'a', path: 'one/a.md' },
      { name: 'a', path: 'two/a.md' },
    ]),
    [{ name: 'a', paths: ['one/a.md', 'two/a.md'] }],
  )
})

test('three files claiming one name report all three, so the fix is not a guess', () => {
  assert.deepEqual(
    collisions([
      { name: 'a', path: 'one/a.md' },
      { name: 'b', path: 'one/b.md' },
      { name: 'a', path: 'two/a.md' },
      { name: 'a', path: 'three/a.md' },
    ]),
    [{ name: 'a', paths: ['one/a.md', 'two/a.md', 'three/a.md'] }],
  )
})

test('a declared frontmatter name wins over the filename', () => {
  assert.equal(frontmatterName('---\nname: map\n---\n# Title'), 'map')
  assert.equal(frontmatterName('---\ndescription: x\n---\n'), null)
  assert.equal(frontmatterName('# No frontmatter\nname: nope'), null)
})

test('a name is read out of the block alone, whatever the line endings', () => {
  assert.equal(frontmatterName('---\r\nname: map\r\n---\r\n# Title'), 'map')
  // `name:` in the body is not a declaration — the block is where the contract
  // is stated, and a loader that read the body would name a skill after a
  // sentence somebody wrote.
  assert.equal(frontmatterName('---\ndescription: x\n---\nname: nope'), null)
})
