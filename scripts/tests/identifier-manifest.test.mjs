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

test('the committed manifest matches the tree', () => {
  const committed = readFileSync(join(ROOT, MANIFEST_PATH), 'utf8')
  const generated = `${JSON.stringify(buildManifest(ROOT), null, 2)}\n`
  assert.equal(
    committed,
    generated,
    'identifiers.json is stale — run `npm run manifest`',
  )
})

test('every listed identifier points at a file that exists', () => {
  const manifest = buildManifest(ROOT)
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
  const manifest = buildManifest(ROOT)
  const known = new Set(manifest.references.map((entry) => entry.name))
  const missing = manifest.canvasReferenceNames.filter((name) => !known.has(name))
  assert.deepEqual(missing, [], 'referenceNames.ts names a doc that is not on disk')
})

test('every hook names a script that exists', () => {
  for (const { event, script } of buildManifest(ROOT).hooks) {
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

test('a declared frontmatter name wins over the filename', () => {
  assert.equal(frontmatterName('---\nname: map\n---\n# Title'), 'map')
  assert.equal(frontmatterName('---\ndescription: x\n---\n'), null)
  assert.equal(frontmatterName('# No frontmatter\nname: nope'), null)
})
