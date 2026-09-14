/**
 * The published loader: Vite's two import forms, for the bundler that is not
 * Vite. A consumer bundling the tool definitions out of the package calls
 * this and nothing else, so what it answers is checked here rather than only
 * through a harness run.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { viteImportsPlugin } from '../vite-imports.mjs'

const plugin = viteImportsPlugin()

test('a `?raw` id loads as the file’s text, quotes and newlines intact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vite-imports-'))
  try {
    const file = join(dir, 'check-fee-visibility.md')
    writeFileSync(file, '# Fees\n\nA "quoted" line.\n')
    const loaded = plugin.load(`${file}?raw`)
    assert.equal(loaded, `export default ${JSON.stringify('# Fees\n\nA "quoted" line.\n')}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('an asset id loads as its own URL string, and is never read', () => {
  assert.equal(plugin.load('/anywhere/cover-figure.svg'), 'export default "/anywhere/cover-figure.svg"')
})

test('anything else is left to the bundler', () => {
  assert.equal(plugin.load('/anywhere/module.ts'), null)
  assert.equal(plugin.load('/anywhere/notes.md'), null)
})
